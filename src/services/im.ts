// 网易云信 NIM Web SDK(V2)封装。消息为纯 SDK P2P(后端不在消息链路);
// 后端登录响应给 neteaskAuthToken(= md5(userId)),accid = String(userId)(id_prefix 为空)。
import NIM from "nim-web-sdk-ng";
import { useUserStore } from "@/stores";
import type { Anchor, Conversation, ChatMessage } from "@/types/eve";
import { parseJsonBigIntSafe } from "@/utils/safeJson";

// 与后端 message.netease.app_key 一致(dev)。
const APP_KEY = "f054437a54d9e818aa91c9b0abb7ae64";

/* eslint-disable @typescript-eslint/no-explicit-any */
let nim: any = null;
let loginPromise: Promise<void> | null = null;

/** 取(惰性创建)NIM 实例(V2 API + 云端会话)。 */
export function getNim(): any {
  if (!nim) {
    nim = NIM.getInstance({
      appkey: APP_KEY,
      apiVersion: "v2",
      enableV2CloudConversation: true,
      debugLevel: "off"
    });
  }
  return nim;
}

/** 已登录的 NIM 账号(未登录返回空)。 */
export function imLoginUser(): string {
  try {
    return getNim().V2NIMLoginService.getLoginUser() || "";
  } catch {
    return "";
  }
}

/** 直接用 accid + token 登录(测试/底层用)。 */
export async function loginIm(account: string, token: string): Promise<void> {
  if (!account || !token) throw new Error("im: missing account/token");
  await getNim().V2NIMLoginService.login(account, token);
}

/**
 * 确保已登录 NIM(幂等)。account/imToken 只读 store 里登录时写入的值,不再回退调用
 * deviceSignIn 兜底拉取 —— 那次"顺手"的重复登录会和当前会话的鉴权请求抢跑,
 * 导致后端把刚建立好的会话判定失效(表现为并发接口莫名其妙 1008/刷新掉线)。
 * imToken 缺失就说明这个环境的登录响应本就没带 neteaskAuthToken,重试也拿不到。
 */
export async function ensureImLogin(): Promise<void> {
  const n = getNim();
  if (n.V2NIMLoginService.getLoginUser()) return;
  if (loginPromise) return loginPromise;
  loginPromise = (async () => {
    const store = useUserStore();
    const account = store.user.id != null ? String(store.user.id) : "";
    const token = store.imToken;
    if (!account || !token) throw new Error("im: no account/token");
    await n.V2NIMLoginService.login(account, token);
  })().finally(() => {
    loginPromise = null;
  });
  return loginPromise;
}

function pad(n: number): string {
  return n < 10 ? "0" + n : String(n);
}
function fmtTime(ms: number): string {
  if (!ms) return "";
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
// 把网易十六进制 messageClientId 折成稳定数字(给 eve 的 number id / :key 用)。
function idNum(clientId: string): number {
  const hex = String(clientId || "").replace(/[^0-9a-f]/gi, "").slice(0, 13);
  return parseInt(hex, 16) || Math.floor(Date.now() + Math.random() * 1000);
}

// V2NIMMessage → eve ChatMessage(messageType 0=文本 1=图片;其余暂按文本占位)。
function toChatMessage(m: any): ChatMessage {
  const t = m?.messageType;
  return {
    id: idNum(m?.messageClientId),
    type: t === 1 ? "image" : "text",
    outgoing: !!m?.isSelf,
    time: fmtTime(m?.createTime),
    text: t === 1 ? undefined : (m?.text ?? ""),
    image: t === 1 ? (m?.attachment?.url ?? m?.attachment?.file ?? "") : undefined
  };
}

// 会话对端 → 最小 Anchor(昵称/头像来自 NIM 用户资料,其余给默认)。
function peerAnchor(peerAccid: string, u: any): Anchor {
  return {
    id: Number(peerAccid) || 0,
    nickname: u?.name || peerAccid,
    avatar: u?.avatar || "",
    age: 0,
    region: "",
    online: false,
    onDuty: false,
    intro: "",
    followers: 0,
    price: 0,
    tags: []
  };
}

// 会话末条文案(纯文本直接取 text,其它类型给占位)。
function lastText(last: any): string {
  if (!last) return "";
  const mt = last.messageType ?? last.message?.messageType;
  if (mt === 1) return "[图片]";
  return last.text ?? last.message?.text ?? "";
}

/** 会话列表(真实 NIM 云端会话)。 */
export async function getConversations(): Promise<Conversation[]> {
  const n = getNim();
  await ensureImLogin();
  const res = await n.V2NIMConversationService.getConversationList(0, 100);
  const list: any[] = res?.conversationList ?? [];
  const peers = list.map((c) => n.V2NIMConversationIdUtil.parseConversationTargetId(c.conversationId));
  let users: any[] = [];
  try {
    users = (await n.V2NIMUserService.getUserList(peers)) ?? [];
  } catch {
    users = [];
  }
  const userMap = new Map<string, any>(users.map((u) => [u.accountId, u]));
  return list.map((c) => {
    const peer = n.V2NIMConversationIdUtil.parseConversationTargetId(c.conversationId);
    return {
      id: Number(peer) || 0,
      user: peerAnchor(peer, userMap.get(peer)),
      text: lastText(c.lastMessage),
      time: fmtTime(c.updateTime || c.sortOrder || c.createTime),
      unread: c.unreadCount || 0
    } as Conversation;
  });
}

/** 与某用户的消息历史(按时间正序)。 */
export async function getMessages(peerUserId: number | string, limit = 50): Promise<ChatMessage[]> {
  const n = getNim();
  await ensureImLogin();
  const conversationId = n.V2NIMConversationIdUtil.p2pConversationId(String(peerUserId));
  const msgs: any[] = (await n.V2NIMMessageService.getMessageList({ conversationId, limit })) ?? [];
  // NIM 默认按时间倒序返回,反转成正序(底部最新)。
  return msgs.slice().reverse().map(toChatMessage);
}

/** 发送文字,返回已发出的消息(乐观渲染用)。 */
export async function sendText(peerUserId: number | string, text: string): Promise<ChatMessage> {
  const n = getNim();
  await ensureImLogin();
  const conversationId = n.V2NIMConversationIdUtil.p2pConversationId(String(peerUserId));
  const msg = n.V2NIMMessageCreator.createTextMessage(text);
  const r = await n.V2NIMMessageService.sendMessage(msg, conversationId);
  return toChatMessage(r?.message ?? msg);
}

/** 监听收到的新消息;回调 (对端 userId, 消息)。返回取消监听函数。 */
export function onMessages(cb: (peerUserId: number, msg: ChatMessage) => void): () => void {
  const n = getNim();
  const handler = (messages: any[]) => {
    for (const m of messages || []) {
      const peer = m?.isSelf ? m?.receiverId : m?.senderId;
      cb(Number(peer) || 0, toChatMessage(m));
    }
  };
  n.V2NIMMessageService.on("onReceiveMessages", handler);
  return () => n.V2NIMMessageService.off("onReceiveMessages", handler);
}

/** eve 通话信令(经网易自定义系统通知 sendAttachMsg 下发,对齐 borders call_eve/*)。 */
export interface EveSignal {
  messageType: string; // call_eve/request | call_eve/accept | call_eve/reject | call_eve/cancel | call_eve/start | call_eve/end
  content: any; // EveSignalPayload: { eveId, rtcRoomId, fromUserId, duration?, rtcInfo?, rtcConfig?, playerUser?, anchorUser? }
  senderId: string;
  sender?: any; // { id, nickname, avatar, gender }
  rtcInfo?: any; // request 带:{ playerToken, playerStreamId, anchorToken, anchorStreamId }(被叫偷跑用)
  rtcConfig?: any; // request 带:初始视频质量
  sentTs?: number; // 服务端下发时刻(网易通知 timestamp);算信令到达延迟/判来电是否已超时
}

// 解析单条信令信封 → EveSignal。信封:{ meta.eventType:"operation_eve_message", data:{ messageType, content }, sender }。
function parseEveSignal(notif: any): EveSignal | null {
  let env: any = null;
  try {
    // 大整数安全解析:来电信令里的 eveId 是雪花 19 位 id,原生 JSON.parse 会丢精度 → 被叫接听/上报会错位。
    env = parseJsonBigIntSafe(notif.content);
  } catch {
    return null;
  }
  if (env?.meta?.eventType !== "operation_eve_message") return null;
  const c = env.data?.content || {};
  return {
    messageType: env.data?.messageType,
    content: c,
    senderId: notif.senderId,
    sender: env.sender,
    rtcInfo: c.rtcInfo,
    rtcConfig: c.rtcConfig,
    sentTs: notif.timestamp || env.meta?.lifecycle?.createdAtMs || 0
  };
}

/**
 * 在与某用户的会话里本地插入一条「未接来电」消息(不发网络)。
 * 用于:来电信令到达时已接近响铃超时(不弹窗)/ 被叫响铃超时未接 —— 在 IM 页留痕,而不是弹个来不及接的窗。
 * insertMessageToLocal 仅写本地库并触发会话更新;失败(SDK 版本差异)静默降级(通话记录里仍有未接)。
 */
export async function insertMissedCall(peerUserId: number | string, text = "[未接来电]"): Promise<void> {
  if (!peerUserId) return;
  try {
    const n = getNim();
    await ensureImLogin();
    const conversationId = n.V2NIMConversationIdUtil.p2pConversationId(String(peerUserId));
    const msg = n.V2NIMMessageCreator.createTextMessage(text);
    await n.V2NIMMessageService.insertMessageToLocal(msg, conversationId, String(peerUserId), Date.now());
  } catch {
    /* best-effort:未接来电在通话记录里也有 */
  }
}

/** 监听 eve 通话信令(来电/接听/拒接/取消/开始/结束)。返回取消监听函数。 */
export function onEveSignal(cb: (sig: EveSignal) => void): () => void {
  const n = getNim();
  const handler = (notifs: any[]) => {
    for (const notif of notifs || []) {
      const sig = parseEveSignal(notif);
      if (sig && sig.messageType) cb(sig);
    }
  };
  n.V2NIMNotificationService.on("onReceiveCustomNotifications", handler);
  return () => n.V2NIMNotificationService.off("onReceiveCustomNotifications", handler);
}

/**
 * 系统公告(送礼/游戏胜利/宠物升级/战力第一等,经 AnnouncementServiceImpl → 网易自定义系统通知下发,
 * 信封 { meta.eventType:"ANNOUNCEMENT", data:Announcement } —— 与 eve 信令共用同一条 NIM 通知通道,
 * 靠 eventType 区分,互不影响)。
 */
export interface AnnouncementSignal {
  id: number;
  type: number; // AnnouncementEnum:1 送礼 2 游戏胜利 3 宠物升级 4 战力第一
  text: string;
  click?: string;
  createdAt: number;
}

// 稳定字符串哈希(Java String.hashCode 算法),把 eventId 折成数字 id 供前端 list :key / 去重用。
function hashId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || Date.now();
}

function parseAnnouncement(notif: any): AnnouncementSignal | null {
  let env: any = null;
  try {
    env = JSON.parse(notif.content);
  } catch {
    return null;
  }
  if (env?.meta?.eventType !== "ANNOUNCEMENT") return null;
  const a = env.data || {};
  const eventId = env.meta?.eventId || a.eventId || String(notif.timestamp ?? Date.now());
  return {
    id: hashId(String(eventId)),
    type: a.type,
    text: a.content?.text || "",
    click: a.click,
    createdAt: notif.timestamp || env.meta?.lifecycle?.createdAtMs || Date.now()
  };
}

/** 监听系统公告推送(送礼/战力榜首/宠物升级/游戏胜利等)。返回取消监听函数。 */
export function onAnnouncement(cb: (a: AnnouncementSignal) => void): () => void {
  const n = getNim();
  const handler = (notifs: any[]) => {
    for (const notif of notifs || []) {
      const a = parseAnnouncement(notif);
      if (a && a.text) cb(a);
    }
  };
  n.V2NIMNotificationService.on("onReceiveCustomNotifications", handler);
  return () => n.V2NIMNotificationService.off("onReceiveCustomNotifications", handler);
}

/** 监听会话列表变化(新会话/末条/未读更新)。返回取消监听函数。 */
export function onConversationsChanged(cb: () => void): () => void {
  const n = getNim();
  const svc = n.V2NIMConversationService;
  const h = () => cb();
  svc.on("onConversationCreated", h);
  svc.on("onConversationChanged", h);
  return () => {
    svc.off("onConversationCreated", h);
    svc.off("onConversationChanged", h);
  };
}
