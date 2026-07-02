// ZEGO 1v1 音视频(zego-express-engine-webrtc)封装。改自原 eve-chat src/hook/useZego.ts,
// 并按即构「1v1 秒开方案」优化推拉流时机:① 预采集本地流(与发起请求并行)
// ② 秒推:入房后立即推流 ③ 秒拉:直接用后端给的对端 streamId 拉流(允许拉空流时连接空挂、对端一推帧即到)
// + roomStreamUpdate 兜底(未开「允许拉空流」时,对端真正推流后触发)。
// 埋点见 callTelemetry(local_ready/room_login/play_start/publish_start/first_frame/net_quality/reconnect/error)。
// appId 与后端 message.zego.app_id 一致(dev=2113499012)。
import { ZegoExpressEngine } from "zego-express-engine-webrtc";
import emitter from "../common/eventBus";
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
const attached = new Set<string>(); // 已把远端 view 贴进容器的 streamId(幂等:秒拉与 ADD 竞态不重复贴/不双拉)
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

// 诊断日志:统一打到浏览器 console(前缀便于 filter),排查「谁没推/谁没拉」用。
function zlog(msg: string, ...rest: any[]): void {
  // eslint-disable-next-line no-console
  console.log(`%c[ZEGO] ${msg}`, "color:#ff2a7a;font-weight:bold", ...rest);
}

// 注册 ZEGO 质量/房间/推拉流状态回调一次:
//  - net_quality(5s 节流打埋点)+ 每次质量实时打 console(看 videoKbps/fps 是否 >0)
//  - publisherStateUpdate:本端推流真的成没成(state=PUBLISHING/err),host 拉不到先看这条
//  - playerStateUpdate:本端拉流真的成没成(state=PLAYING/err)
//  - remoteCameraStatusUpdate:对端摄像头开没开(OPEN=对端在推视频)
//  - reconnect
function wireEvents(g: any): void {
  if (eventsWired) return;
  eventsWired = true;
  const onQuality = (dir: "PUB" | "PLAY", lossKey: string) => (streamID: string, stats: any) => {
    const rtt = Number(stats?.rtt ?? stats?.peerToPeerDelay ?? 0);
    if (rtt) noteRtt(rtt);
    const vKbps = Math.round(Number(stats?.video?.videoBitrate ?? stats?.videoBitrate ?? 0));
    const vFps = Math.round(Number(stats?.video?.videoFPS ?? stats?.videoRecvFPS ?? stats?.videoFPS ?? 0));
    // 每次都打 console(host 看不到 webapp 时,这里 PUB 的 vKbps 应 >0;=0 说明本端没在上行推视频)
    zlog(`${dir} quality stream=${streamID} vKbps=${vKbps} vFps=${vFps} rtt=${rtt}`);
    const now = Date.now();
    if (now - lastQualityTs < 5000) return; // 5s 一条埋点
    lastQualityTs = now;
    track("net_quality", {
      rttMs: rtt || undefined,
      [lossKey]: Number(stats?.packetLostRate ?? 0),
      level: stats?.networkQuality ?? rttToLevel(rtt),
      videoKbps: vKbps,
      videoFps: vFps
    });
  };
  g.on("playQualityUpdate", onQuality("PLAY", "playLossRate"));
  g.on("publishQualityUpdate", onQuality("PUB", "publishLossRate"));

  // 本端推流状态:PUBLISHING=推上了;NO_PUBLISH/errorCode!=0=没推上(host 就拉不到)。
  g.on("publisherStateUpdate", (result: any) => {
    const streamID = result?.streamID;
    const state = result?.state;
    const errorCode = Number(result?.errorCode ?? 0);
    zlog(`▶PUB state stream=${streamID} state=${state} err=${errorCode}`, result);
    track("publish_state", { streamId: String(streamID ?? ""), state: String(state ?? ""), errCode: String(errorCode) });
    if (errorCode) {
      track("error", { stage: "publish", errCode: String(errorCode), errMsg: `publisherState ${state}`, streamId: String(streamID ?? ""), fatal: false });
    }
  });

  // 本端拉流状态:PLAYING=拉上了;NO_PLAY/errorCode!=0=没拉上。
  g.on("playerStateUpdate", (result: any) => {
    const streamID = result?.streamID;
    const state = result?.state;
    const errorCode = Number(result?.errorCode ?? 0);
    zlog(`◀PLAY state stream=${streamID} state=${state} err=${errorCode}`, result);
    track("play_state", { streamId: String(streamID ?? ""), state: String(state ?? ""), errCode: String(errorCode) });
    if (errorCode) {
      track("error", { stage: "play_state", errCode: String(errorCode), errMsg: `playerState ${state}`, streamId: String(streamID ?? ""), fatal: false });
    }
  });

  // 对端摄像头开/关(OPEN=对端在推视频,本端应能看到)。
  g.on("remoteCameraStatusUpdate", (streamID: string, status: string) => {
    zlog(`◀PLAY remote-camera stream=${streamID} status=${status}`);
  });
  g.on("remoteMicStatusUpdate", (streamID: string, status: string) => {
    zlog(`◀PLAY remote-mic stream=${streamID} status=${status}`);
  });

  g.on("roomStateUpdate", (_roomID: string, state: string, errorCode: number) => {
    zlog(`room state=${state} err=${errorCode}`);
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

  // 房间流增删也打 console(host 推流后 webapp 应收到 ADD;反之 webapp 推流后 host logcat 应有 ADD)。
  g.on("roomStreamUpdate", (_roomID: string, updateType: string, streamList: any[]) => {
    for (const s of streamList || []) zlog(`roomStreamUpdate ${updateType} stream=${s?.streamID} user=${s?.user?.userID ?? ""}`);
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
  if (attached.has(streamId)) return; // view 已贴(秒拉/ADD 竞态)→ 幂等,别重复贴/重复拉
  // 偷跑已建连 → 直接把暂存 view 贴到容器(秒显,免重新建连)
  const pre = prewarmViews.get(streamId);
  if (pre) {
    prewarmViews.delete(streamId);
    try {
      pre.play(containerId, { enableAutoplayDialog: true });
      attached.add(streamId);
      bindFirstFrame(containerId, streamId);
    } catch {
      /* ignore */
    }
    return;
  }
  if (playing.has(streamId)) return; // 拉流 in-flight,避免并发双拉
  playing.add(streamId);
  if (trigger !== "stream_update") mark("playStart");
  track("play_start", { streamId, allowEmptyStream: ALLOW_EMPTY_STREAM, trigger });
  try {
    const remote = await startPlayingRobust(streamId);
    const view = getZego().createRemoteStreamView(remote);
    view.play(containerId, { enableAutoplayDialog: true });
    attached.add(streamId); // 贴成功 → 标记,后续 ADD/秒拉 幂等跳过
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

// 拉流拿远端句柄:处理「秒拉与 roomStreamUpdate ADD 对同一条流双拉」竞态 —— 秒拉可能 JS 层报错但 SDK 已订上该流,
// ADD 再拉时 startPlayingStream 抛 1103049(流已在拉)且拿不到句柄 → view 永远贴不上(表现为「拉到了流却没画面」)。
// 修:遇 1103049 先 stopPlayingStream 清掉旧订阅,再拉一次拿到干净句柄贴 view。
async function startPlayingRobust(streamId: string): Promise<any> {
  const g = getZego();
  try {
    return await g.startPlayingStream(streamId);
  } catch (e: any) {
    if (String(e?.errorCode) !== "1103049") throw e;
    try {
      g.stopPlayingStream(streamId);
    } catch {
      /* ignore */
    }
    return g.startPlayingStream(streamId);
  }
}

// 真首帧:只认「有真实分辨率的解码帧」(videoWidth>0)。允许拉空流时会先建出一个空 <video>,
// 单看 loadeddata/readyState 会误报首帧;必须校验 videoWidth>0。优先用 requestVideoFrameCallback(帧呈现即回调),
// 无则轮询尺寸(带 deadline 防空转)。命中即打 first_frame + 广播 rtc:first-frame(CallPage 据此揭示对端画面=真秒开)。
function bindFirstFrame(containerId: string, streamId: string): void {
  if (firstFramed.has(streamId)) return;
  const t0 = Date.now();
  const deadline = t0 + 20000;
  const fire = (video: HTMLVideoElement) => {
    if (firstFramed.has(streamId)) return;
    firstFramed.add(streamId);
    trackFirstFrame(streamId, { w: video.videoWidth, h: video.videoHeight, codec: "H.264" }, undefined, Date.now() - t0);
    emitter.emit("rtc:first-frame", { streamId, w: video.videoWidth, h: video.videoHeight });
  };
  const tryBind = (attempt = 0) => {
    const el = document.getElementById(containerId);
    const video = el?.querySelector("video") as HTMLVideoElement | null;
    if (!video) {
      if (attempt < 40) window.setTimeout(() => tryBind(attempt + 1), 100);
      return;
    }
    const check = () => {
      if (firstFramed.has(streamId)) return;
      if (video.videoWidth > 0 && video.readyState >= 2) return fire(video); // 真解码帧到达
      if (Date.now() > deadline) return; // 一直没真帧 → 放弃轮询,避免空转
      const rvfc = (video as unknown as { requestVideoFrameCallback?: (cb: () => void) => void }).requestVideoFrameCallback;
      if (typeof rvfc === "function") rvfc.call(video, () => check());
      else window.setTimeout(check, 150);
    };
    check();
  };
  tryBind();
}

/** 兜底:监听房间流变化,对端真正推流(ADD)时拉流;DELETE 时停。返回取消监听函数。 */
export function watchRoomStreams(containerId: string): () => void {
  const g = getZego();
  const handler = (_roomID: string, updateType: string, streamList: any[]) => {
    if (updateType === "ADD") {
      for (const s of streamList || []) {
        // 见到对端真正推流(ADD)= 已接通(即使 call_eve/accept 信令丢了):通知状态机接通兜底
        emitter.emit("rtc:remote-stream", { streamId: s.streamID, userId: s?.user?.userID });
        void playStream(s.streamID, containerId, "stream_update");
      }
    } else if (updateType === "DELETE") {
      for (const s of streamList || []) {
        try {
          g.stopPlayingStream(s.streamID);
        } catch {
          /* ignore */
        }
        playing.delete(s.streamID);
        attached.delete(s.streamID);
        firstFramed.delete(s.streamID);
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
    attached.clear();
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
