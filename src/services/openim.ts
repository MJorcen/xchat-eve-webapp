// OpenIM 客户端封装(@openim/wasm-client-sdk,对接自部署 openim-server v3.8.3 @ support-local)。
// - wasm 资产已拷 public/(openIM.wasm / sql-wasm.wasm / wasm_exec.js,index.html 引入 wasm_exec)
// - token 由业务后端签发:GET /user/auth/im/token?platform=5(user-svc 持 secret,自愈开户;
//   通道未启用返回 null → 前端降级报错,不再有 dev secret 进前端)。
// - 用途:新聊天页(OpenImChatPage)收发单聊文本;后续替换云信聊天。
import { getSDK, CbEvents, ViewType } from "@openim/wasm-client-sdk";
import type { MessageItem, WsResponse, ConversationItem } from "@openim/wasm-client-sdk";
import { http } from "./http";
import { uploadFile } from "./upload";
import { useUserStore } from "@/stores";

const OIM_WS = (import.meta.env.VITE_OPENIM_WS as string) || "ws://192.168.10.10:10001";
// SDK 内 wasm 核心自己发 API 请求(在 worker 里,走绝对地址):
const OIM_API_DIRECT = (import.meta.env.VITE_OPENIM_API as string) || "http://192.168.10.10:10002";
const PLATFORM_WEB = 5;

export const OpenIM = getSDK({
  coreWasmPath: "/openIM.wasm",
  sqlWasmPath: "/sql-wasm.wasm",
  debug: false
});

let loggedIn = false;
let loginInFlight: Promise<void> | null = null;

/** 登录 OpenIM(幂等)。token 由业务后端按平台签发(web=5)。 */
export async function ensureOpenImLogin(): Promise<void> {
  if (loggedIn) return;
  if (loginInFlight) return loginInFlight;
  loginInFlight = (async () => {
    const store = useUserStore();
    const userID = String(store.user.id || "");
    if (!userID) throw new Error("openim: not signed in");
    const token = await http.get<string | null>("/user/auth/im/token", { platform: PLATFORM_WEB });
    if (!token) throw new Error("openim: channel disabled (backend returned no token)");
    await OpenIM.login({
      userID,
      token,
      platformID: PLATFORM_WEB,
      apiAddr: OIM_API_DIRECT,
      wsAddr: OIM_WS
    });
    loggedIn = true;
    // eslint-disable-next-line no-console
    console.log(`%c[OIM] logged in userID=${userID}`, "color:#4e9cff;font-weight:bold");
  })().finally(() => {
    loginInFlight = null;
  });
  return loginInFlight;
}

/** 发单聊文本。返回已发送消息(乐观渲染用)。 */
export async function oimSendText(recvID: string, text: string): Promise<MessageItem> {
  await ensureOpenImLogin();
  const created: WsResponse<MessageItem> = await OpenIM.createTextMessage(text);
  const sent = await OpenIM.sendMessage({ recvID, groupID: "", message: created.data });
  return sent.data;
}

/** 读图片像素尺寸(构造图片消息需要)。 */
function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/**
 * 发单聊图片:先 COS 直传(model=chat)拿公开 URL,再 createImageMessageByURL(不走 OpenIM 内置 MinIO)。
 * source/big/snapshot 三档 POC 都用同一张 COS 图。
 */
export async function oimSendImage(recvID: string, file: File): Promise<MessageItem> {
  await ensureOpenImLogin();
  const [url, dim] = await Promise.all([uploadFile(file, "chat"), readImageSize(file)]);
  const uuid = `${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  const pic = {
    uuid,
    type: file.type.split("/")[1] || "jpg",
    size: file.size,
    width: dim.width,
    height: dim.height,
    url
  };
  const created = await OpenIM.createImageMessageByURL({
    sourcePath: "",
    sourcePicture: pic,
    bigPicture: pic,
    snapshotPicture: pic
  });
  // ByURL 消息已含 COS 地址,必须用 NotOss 发送:sendMessage 会重复走 OSS 上传 → 10005
  const sent = await OpenIM.sendMessageNotOss({ recvID, groupID: "", message: created.data });
  return sent.data;
}

/** 监听新消息(单聊文本)。返回取消函数。 */
export function onOimMessages(cb: (msg: MessageItem) => void): () => void {
  const handler = ({ data }: WsResponse<MessageItem[]>) => {
    for (const m of data || []) cb(m);
  };
  OpenIM.on(CbEvents.OnRecvNewMessages, handler as never);
  return () => OpenIM.off(CbEvents.OnRecvNewMessages, handler as never);
}

/** OpenIM 会话(独立分区用,精简字段)。 */
export type OimConversation = {
  conversationID: string;
  userID: string;
  showName: string;
  faceURL: string;
  unreadCount: number;
  lastText: string;
  lastTime: number;
};

/** 解析会话 latestMsg(JSON 序列化的 MessageItem)为展示文案。 */
function parseLatest(latestMsg: string): string {
  if (!latestMsg) return "";
  try {
    const m = JSON.parse(latestMsg) as MessageItem;
    if (m.contentType === 101) return (m.textElem as { content?: string })?.content ?? "";
    return "[消息]";
  } catch {
    return "";
  }
}

/** 拉全部单聊会话(按最近时间倒序,含未读数)。 */
export async function oimConversations(): Promise<OimConversation[]> {
  await ensureOpenImLogin();
  const r = await OpenIM.getAllConversationList();
  return ((r.data as ConversationItem[]) || [])
    .filter((c) => c.conversationType === 1) // 只要单聊
    .map((c) => ({
      conversationID: c.conversationID,
      userID: c.userID,
      showName: c.showName || c.userID,
      faceURL: c.faceURL,
      unreadCount: c.unreadCount,
      lastText: parseLatest(c.latestMsg),
      lastTime: c.latestMsgSendTime
    }))
    .sort((a, b) => b.lastTime - a.lastTime);
}

/** 监听会话变更(新会话/未读变化/最后一条变化)→ 回调刷新列表。返回取消函数。 */
export function onOimConversationsChanged(cb: () => void): () => void {
  const h = () => cb();
  OpenIM.on(CbEvents.OnConversationChanged, h as never);
  OpenIM.on(CbEvents.OnNewConversation, h as never);
  OpenIM.on(CbEvents.OnTotalUnreadMessageCountChanged, h as never);
  return () => {
    OpenIM.off(CbEvents.OnConversationChanged, h as never);
    OpenIM.off(CbEvents.OnNewConversation, h as never);
    OpenIM.off(CbEvents.OnTotalUnreadMessageCountChanged, h as never);
  };
}

/** 标记会话已读(清未读)。conversationID = si_小id_大id。 */
export async function oimMarkRead(conversationID: string): Promise<void> {
  try {
    await ensureOpenImLogin();
    await OpenIM.markConversationMessageAsRead(conversationID);
  } catch {
    /* 忽略:未登录/会话不存在 */
  }
}

/** 单聊会话 id 规则:si_小id_大id。 */
export function oimSingleConversationId(peerID: string): string {
  const store = useUserStore();
  return `si_${[String(store.user.id), peerID].sort().join("_")}`;
}

/** 拉与某人的历史消息(最近 N 条,按时间正序)。 */
export async function oimHistory(peerID: string, count = 30): Promise<MessageItem[]> {
  await ensureOpenImLogin();
  const store = useUserStore();
  const conversationID = `si_${[String(store.user.id), peerID].sort().join("_")}`; // 单聊会话 id 规则:si_小id_大id
  try {
    const r = await OpenIM.getAdvancedHistoryMessageList({
      conversationID,
      count,
      startClientMsgID: "",
      viewType: ViewType.History
    });
    return (r.data?.messageList as MessageItem[]) || [];
  } catch {
    return [];
  }
}
