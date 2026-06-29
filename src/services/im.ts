// 网易云信 NIM Web SDK(V2)封装。消息为纯 SDK P2P(后端不在消息链路);
// 后端登录响应给 neteaskAuthToken(= md5(userId)),accid = String(userId)(id_prefix 为空)。
import NIM from "nim-web-sdk-ng";
import { useUserStore } from "@/stores";
import { deviceSignIn } from "./auth";
import type { Anchor, Conversation, ChatMessage } from "@/types/eve";

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

/** 确保已登录 NIM(幂等)。imToken 缺失时回退 deviceSignIn 拉取并写回 store。 */
export async function ensureImLogin(): Promise<void> {
  const n = getNim();
  if (n.V2NIMLoginService.getLoginUser()) return;
  if (loginPromise) return loginPromise;
  loginPromise = (async () => {
    const store = useUserStore();
    let account = store.user.id != null ? String(store.user.id) : "";
    let token = store.imToken;
    if (!account || !token) {
      const vo = await deviceSignIn();
      account = String(vo.user?.id ?? "");
      token = vo.neteaskAuthToken ?? "";
      store.setAuth(store.token, undefined, token);
    }
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
