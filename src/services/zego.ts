// ZEGO 1v1 音视频(zego-express-engine-webrtc)封装。改自原 eve-chat src/hook/useZego.ts,
// 并按即构「1v1 秒开方案」优化推拉流时机:① 预采集本地流(与发起请求并行)
// ② 秒推:入房后立即推流 ③ 秒拉:直接用后端给的对端 streamId 拉流(允许拉空流时连接空挂、对端一推帧即到)
// + roomStreamUpdate 兜底(未开「允许拉空流」时,对端真正推流后触发)。
// appId 与后端 message.zego.app_id 一致(dev=2113499012)。
import { ZegoExpressEngine } from "zego-express-engine-webrtc";

const APP_ID = Number(import.meta.env.VITE_ZEGO_APPID || 2113499012);
const SERVER = (import.meta.env.VITE_ZEGO_SERVER as string) || "https://rtc-api.zego.im/?Action=";

/* eslint-disable @typescript-eslint/no-explicit-any */
let zg: any = null;
let localStream: any = null;
const playing = new Set<string>(); // 已在拉的远端 streamId,去重(直拉 + 兜底避免重复 play)

export function getZego(): any {
  if (!zg) {
    zg = new ZegoExpressEngine(APP_ID, SERVER);
    zg.setDebugVerbose(false);
  }
  return zg;
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
  if (!localStream) localStream = await g.createZegoStream();
  const el = document.getElementById(localVideoElId);
  if (el) localStream.playVideo?.(el);
  return localStream;
}

/** 登录 ZEGO 房间(先退旧房间)。 */
export async function joinRoom(roomId: string, token: string, userId: string): Promise<boolean> {
  const g = getZego();
  try {
    await g.logoutRoom();
  } catch {
    /* 无旧房间忽略 */
  }
  const ok = await g.loginRoom(roomId, token, { userID: userId, userName: userId }, { userUpdate: true });
  return ok === true;
}

/** 秒推:推已预采集的本地流(streamId 用后端 playerStreamId,供后端检测双流计费)。 */
export function publishLocal(streamId: string): void {
  if (localStream) getZego().startPublishingStream(streamId, localStream);
}

/** 拉指定 streamId 的远端流到 containerId(去重)。秒拉时直接传 anchorStreamId。 */
export async function playStream(streamId: string, containerId: string): Promise<void> {
  if (!streamId || playing.has(streamId)) return;
  playing.add(streamId);
  try {
    const remote = await getZego().startPlayingStream(streamId);
    const view = getZego().createRemoteStreamView(remote);
    view.play(containerId, { enableAutoplayDialog: true });
  } catch {
    playing.delete(streamId); // 失败(如未开允许拉空流且对端未推)→ 交给 roomStreamUpdate 兜底
  }
}

/** 兜底:监听房间流变化,对端真正推流(ADD)时拉流;DELETE 时停。返回取消监听函数。 */
export function watchRoomStreams(containerId: string): () => void {
  const g = getZego();
  const handler = (_roomID: string, updateType: string, streamList: any[]) => {
    if (updateType === "ADD") {
      for (const s of streamList || []) void playStream(s.streamID, containerId);
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
    await g.logoutRoom();
  } catch {
    /* ignore */
  }
}
