// ZEGO 1v1 音视频(zego-express-engine-webrtc)封装,改自原 eve-chat src/hook/useZego.ts。
// appId 与后端 message.zego.app_id 一致(dev=2113499012);房间/token/streamId 由 /connect/eve/* 提供。
// 注:headless 预览无摄像头/麦克风、无双端,媒体部分无法验证,仅能验证引擎初始化与入房尝试。
import { ZegoExpressEngine } from "zego-express-engine-webrtc";

const APP_ID = Number(import.meta.env.VITE_ZEGO_APPID || 2113499012);
const SERVER = (import.meta.env.VITE_ZEGO_SERVER as string) || "https://rtc-api.zego.im/?Action=";

/* eslint-disable @typescript-eslint/no-explicit-any */
let zg: any = null;
let localStream: any = null;

export function getZego(): any {
  if (!zg) {
    zg = new ZegoExpressEngine(APP_ID, SERVER);
    zg.setDebugVerbose(false);
  }
  return zg;
}

/** webRTC 兼容性检查。 */
export async function checkRtcSupport(): Promise<boolean> {
  try {
    const r = await getZego().checkSystemRequirements();
    return !!r?.webRTC;
  } catch {
    return false;
  }
}

/** 登录 ZEGO 房间(先退出旧房间)。 */
export async function joinRoom(roomId: string, token: string, userId: string): Promise<boolean> {
  const g = getZego();
  try {
    await g.logoutRoom();
  } catch {
    /* 没有旧房间忽略 */
  }
  const ok = await g.loginRoom(roomId, token, { userID: userId, userName: userId }, { userUpdate: true });
  return ok === true;
}

/** 采集本地流并推流(streamId 用后端给的 playerStreamId);localVideoElId 为本地预览容器 id。 */
export async function publishLocal(streamId: string, localVideoElId: string): Promise<void> {
  const g = getZego();
  localStream = await g.createZegoStream();
  const el = document.getElementById(localVideoElId);
  if (el) localStream.playVideo?.(el);
  g.startPublishingStream(streamId, localStream);
}

/** 监听远端流并在 containerId 播放(roomStreamUpdate ADD/DELETE)。返回取消监听函数。 */
export function playRemoteOn(containerId: string): () => void {
  const g = getZego();
  const handler = async (_roomID: string, updateType: string, streamList: any[]) => {
    if (updateType === "ADD" && streamList[0]) {
      const remote = await g.startPlayingStream(streamList[0].streamID);
      const view = g.createRemoteStreamView(remote);
      view.play(containerId, { enableAutoplayDialog: true });
    } else if (updateType === "DELETE" && streamList[0]) {
      g.stopPlayingStream(streamList[0].streamID);
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

/** 退出房间 + 销毁本地流。 */
export async function leaveRoom(): Promise<void> {
  const g = getZego();
  try {
    if (localStream) {
      g.destroyStream?.(localStream);
      localStream = null;
    }
    await g.logoutRoom();
  } catch {
    /* 忽略 */
  }
}
