// ZEGO 1v1 音视频(zego-express-engine-webrtc)封装。改自原 eve-chat src/hook/useZego.ts,
// 并按即构「1v1 秒开方案」优化推拉流时机:① 预采集本地流(与发起请求并行)
// ② 秒推:入房后立即推流 ③ 秒拉:直接用后端给的对端 streamId 拉流(允许拉空流时连接空挂、对端一推帧即到)
// + roomStreamUpdate 兜底(未开「允许拉空流」时,对端真正推流后触发)。
// 埋点见 callTelemetry(local_ready/room_login/play_start/publish_start/first_frame/net_quality/reconnect/error)。
// appId 与后端 message.zego.app_id 一致(dev=2113499012)。
import { ZegoExpressEngine } from "zego-express-engine-webrtc";
import {
  track,
  trackFirstFrame,
  trackReconnect,
  noteRtt,
  mark
} from "./callTelemetry";

const APP_ID = Number(import.meta.env.VITE_ZEGO_APPID || 2113499012);
const SERVER = (import.meta.env.VITE_ZEGO_SERVER as string) || "https://rtc-api.zego.im/?Action=";
// 反映 ZEGO 控制台「允许拉空流」开关的预期(运维侧开启后秒拉才生效),随 play_start 上报便于核对。
const ALLOW_EMPTY_STREAM = true;

/* eslint-disable @typescript-eslint/no-explicit-any */
let zg: any = null;
let localStream: any = null;
let eventsWired = false;
let lastQualityTs = 0; // net_quality 5s 节流
let roomDown = false; // 房间断开标记(用于 reconnect)
let joinedRoomId: string | null = null; // 当前已入房间(偷跑预入后 CallPage 再 join 同房幂等,不重登避免断流)
const playing = new Set<string>(); // 已在拉的远端 streamId,去重(直拉 + 兜底避免重复 play)
const firstFramed = new Set<string>(); // 已打首帧的 streamId,去重
const prewarmViews = new Map<string, any>(); // 偷跑预拉但未贴 DOM 的 view(容器渲染后再 attach)

export function getZego(): any {
  if (!zg) {
    zg = new ZegoExpressEngine(APP_ID, SERVER);
    zg.setDebugVerbose(false);
    wireEvents(zg);
  }
  return zg;
}

// 注册 ZEGO 质量/房间状态回调一次:net_quality(5s 节流)+ reconnect。
function wireEvents(g: any): void {
  if (eventsWired) return;
  eventsWired = true;
  const onQuality = (lossKey: string) => (_streamID: string, stats: any) => {
    const rtt = Number(stats?.rtt ?? stats?.peerToPeerDelay ?? 0);
    if (rtt) noteRtt(rtt);
    const now = Date.now();
    if (now - lastQualityTs < 5000) return; // 5s 一条
    lastQualityTs = now;
    track("net_quality", {
      rttMs: rtt || undefined,
      [lossKey]: Number(stats?.packetLostRate ?? 0),
      level: stats?.networkQuality ?? rttToLevel(rtt),
      videoKbps: Math.round(Number(stats?.video?.videoBitrate ?? stats?.videoBitrate ?? 0)),
      videoFps: Math.round(Number(stats?.video?.videoFPS ?? stats?.videoRecvFPS ?? stats?.videoFPS ?? 0))
    });
  };
  g.on("playQualityUpdate", onQuality("playLossRate"));
  g.on("publishQualityUpdate", onQuality("publishLossRate"));
  g.on("roomStateUpdate", (_roomID: string, state: string, errorCode: number) => {
    if (state === "DISCONNECTED" || state === "CONNECTING") {
      if (!roomDown) {
        roomDown = true;
        mark("down");
      }
    } else if (state === "CONNECTED" && roomDown) {
      roomDown = false;
      trackReconnect("room", errorCode ? `code_${errorCode}` : "reconnected");
    }
  });
}

function rttToLevel(rtt: number): string {
  if (!rtt) return "unknown";
  if (rtt < 100) return "good";
  if (rtt < 300) return "medium";
  return "bad";
}

export async function checkRtcSupport(): Promise<boolean> {
  try {
    const r = await getZego().checkSystemRequirements();
    return !!r?.webRTC;
  } catch {
    return false;
  }
}

/** 秒开①:预采集本地流(摄像头/麦克风)并做本地预览。进通话页即调,与 requestCall 并行,避免接通时才采集。 */
export async function prepareLocalStream(localVideoElId: string): Promise<any> {
  const g = getZego();
  if (!localStream) {
    const permState = await queryPermState();
    const t0 = Date.now();
    try {
      localStream = await g.createZegoStream();
      track("local_ready", {
        permState,
        permPromptShown: permState === "prompt",
        permCostMs: permState === "prompt" ? Date.now() - t0 : 0, // 弹框时与采集耗时合并(近似)
        captureCostMs: Date.now() - t0,
        hasCamera: true,
        hasMic: true,
        result: "ok",
        errCode: 0
      });
    } catch (e: any) {
      track("local_ready", { permState, result: "fail", errCode: String(e?.errorCode ?? e?.code ?? "") });
      track("error", { stage: "capture", errCode: String(e?.errorCode ?? ""), errMsg: String(e?.message ?? e), fatal: true });
      throw e;
    }
  }
  const el = document.getElementById(localVideoElId);
  if (el) localStream.playVideo?.(el);
  return localStream;
}

async function queryPermState(): Promise<string> {
  try {
    const p: any = (navigator as any)?.permissions;
    if (!p?.query) return "unknown";
    const r = await p.query({ name: "camera" } as any);
    return r?.state || "unknown";
  } catch {
    return "unknown";
  }
}

/** 登录 ZEGO 房间(先退旧房间)。同房间已入则幂等返回(偷跑预入 → CallPage 再 join 不重登)。trigger:dial/invite/accept(埋点用)。 */
export async function joinRoom(
  roomId: string,
  token: string,
  userId: string,
  trigger: "dial" | "invite" | "accept" = "dial"
): Promise<boolean> {
  if (joinedRoomId === roomId) return true; // 已入(含偷跑),幂等不重登,避免断掉预拉/预推
  const g = getZego();
  try {
    await g.logoutRoom();
  } catch {
    /* 无旧房间忽略 */
  }
  const callTs = Date.now();
  try {
    const ok = await g.loginRoom(roomId, token, { userID: userId, userName: userId }, { userUpdate: true });
    const okTs = Date.now();
    if (ok === true) joinedRoomId = roomId;
    track("room_login", {
      loginCallTs: callTs,
      loginOkTs: okTs,
      loginCostMs: okTs - callTs,
      trigger,
      result: ok === true ? "ok" : "fail",
      errCode: 0
    });
    return ok === true;
  } catch (e: any) {
    track("error", { stage: "room_login", errCode: String(e?.errorCode ?? ""), errMsg: String(e?.message ?? e), fatal: true });
    return false;
  }
}

/** 偷跑预拉:收到来电即建立拉流连接(allow-empty 空挂),但容器还没渲染 → view 暂存,playStream 时再贴(秒显)。 */
export async function prewarmPull(streamId: string): Promise<void> {
  if (!streamId || playing.has(streamId)) return;
  playing.add(streamId);
  mark("playStart");
  track("play_start", { streamId, allowEmptyStream: ALLOW_EMPTY_STREAM, trigger: "invite" });
  try {
    const remote = await getZego().startPlayingStream(streamId);
    prewarmViews.set(streamId, getZego().createRemoteStreamView(remote));
  } catch (e: any) {
    playing.delete(streamId);
    track("error", { stage: "play", errCode: String(e?.errorCode ?? ""), errMsg: String(e?.message ?? e), streamId, fatal: false, retry: 1 });
  }
}

/** 秒推:推已预采集的本地流。trigger:dial/invite(女早推)/accept(男接通后)。 */
export function publishLocal(streamId: string, trigger: "dial" | "invite" | "accept" = "accept"): void {
  if (!localStream) return;
  getZego().startPublishingStream(streamId, localStream);
  track("publish_start", { streamId, trigger });
}

/** 拉指定 streamId 的远端流到 containerId(去重)。秒拉时直接传对端 streamId。trigger:dial/invite/stream_update。 */
export async function playStream(
  streamId: string,
  containerId: string,
  trigger: "dial" | "invite" | "stream_update" = "dial"
): Promise<void> {
  if (!streamId) return;
  // 偷跑已建连 → 直接把暂存 view 贴到容器(秒显,免重新建连)
  const pre = prewarmViews.get(streamId);
  if (pre) {
    prewarmViews.delete(streamId);
    try {
      pre.play(containerId, { enableAutoplayDialog: true });
      bindFirstFrame(containerId, streamId);
    } catch {
      /* ignore */
    }
    return;
  }
  if (playing.has(streamId)) return;
  playing.add(streamId);
  if (trigger !== "stream_update") mark("playStart");
  track("play_start", { streamId, allowEmptyStream: ALLOW_EMPTY_STREAM, trigger });
  try {
    const remote = await getZego().startPlayingStream(streamId);
    const view = getZego().createRemoteStreamView(remote);
    view.play(containerId, { enableAutoplayDialog: true });
    bindFirstFrame(containerId, streamId);
  } catch (e: any) {
    playing.delete(streamId); // 失败(如未开允许拉空流且对端未推)→ 交给 roomStreamUpdate 兜底
    track("error", {
      stage: "play",
      errCode: String(e?.errorCode ?? ""),
      errMsg: String(e?.message ?? e),
      streamId,
      fatal: false,
      retry: 1
    });
  }
}

// 首帧:监听容器内 <video> 的 loadeddata(首帧解码),取真实分辨率,打 first_frame(仅 player,内部判定)。
function bindFirstFrame(containerId: string, streamId: string): void {
  if (firstFramed.has(streamId)) return;
  const t0 = Date.now();
  const tryBind = (attempt = 0) => {
    const el = document.getElementById(containerId);
    const video = el?.querySelector("video") as HTMLVideoElement | null;
    if (!video) {
      if (attempt < 20) window.setTimeout(() => tryBind(attempt + 1), 100);
      return;
    }
    const onFrame = () => {
      if (firstFramed.has(streamId)) return;
      firstFramed.add(streamId);
      trackFirstFrame(
        streamId,
        { w: video.videoWidth, h: video.videoHeight, codec: "H.264" },
        undefined,
        Date.now() - t0
      );
    };
    if (video.readyState >= 2) onFrame();
    else video.addEventListener("loadeddata", onFrame, { once: true });
  };
  tryBind();
}

/** 兜底:监听房间流变化,对端真正推流(ADD)时拉流;DELETE 时停。返回取消监听函数。 */
export function watchRoomStreams(containerId: string): () => void {
  const g = getZego();
  const handler = (_roomID: string, updateType: string, streamList: any[]) => {
    if (updateType === "ADD") {
      for (const s of streamList || []) void playStream(s.streamID, containerId, "stream_update");
    } else if (updateType === "DELETE") {
      for (const s of streamList || []) {
        try {
          g.stopPlayingStream(s.streamID);
        } catch {
          /* ignore */
        }
        playing.delete(s.streamID);
      }
    }
  };
  g.on("roomStreamUpdate", handler);
  return () => g.off?.("roomStreamUpdate", handler);
}

export function setMicEnabled(on: boolean): void {
  if (localStream) getZego().mutePublishStreamAudio(localStream, !on);
}
export function setCameraEnabled(on: boolean): void {
  if (localStream) getZego().mutePublishStreamVideo(localStream, !on);
}

/** 退房 + 销毁本地流 + 清拉流记录。 */
export async function leaveRoom(): Promise<void> {
  const g = getZego();
  try {
    if (localStream) {
      g.destroyStream?.(localStream);
      localStream = null;
    }
    playing.clear();
    firstFramed.clear();
    prewarmViews.clear();
    joinedRoomId = null;
    roomDown = false;
    lastQualityTs = 0;
    await g.logoutRoom();
  } catch {
    /* ignore */
  }
}
