// OpenIM 客户端封装(@openim/wasm-client-sdk,对接自部署 openim-server v3.8.3 @ support-local)。
// - wasm 资产已拷 public/(openIM.wasm / sql-wasm.wasm / wasm_exec.js,index.html 引入 wasm_exec)
// - dev token 签发:经 vite 代理 /oim-api 直调 server(get_admin_token → get_user_token)。
//   ⚠️ 仅 dev POC:secret 不能进生产前端,正式方案由后端(user-svc)签发 OpenIM token 随登录下发。
// - 用途:新聊天页(OpenImChatPage)收发单聊文本;后续替换云信聊天。
import { getSDK, CbEvents, ViewType } from "@openim/wasm-client-sdk";
import type { MessageItem, WsResponse } from "@openim/wasm-client-sdk";
import { useUserStore } from "@/stores";

const OIM_API_PROXY = "/oim-api"; // vite 代理 → http://192.168.10.10:10002
const OIM_WS = (import.meta.env.VITE_OPENIM_WS as string) || "ws://192.168.10.10:10001";
// SDK 内 wasm 核心自己发 API 请求(在 worker 里,走绝对地址),不经 vite 代理:
const OIM_API_DIRECT = (import.meta.env.VITE_OPENIM_API as string) || "http://192.168.10.10:10002";
const PLATFORM_WEB = 5;
const DEV_SECRET = "openIM123"; // dev 自部署 secret(POC)

export const OpenIM = getSDK({
  coreWasmPath: "/openIM.wasm",
  sqlWasmPath: "/sql-wasm.wasm",
  debug: false
});

let loggedIn = false;
let loginInFlight: Promise<void> | null = null;

async function oimFetch<T = any>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${OIM_API_PROXY}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      operationID: `eve-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      ...(token ? { token } : {})
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (data.errCode !== 0) throw new Error(`openim ${path} err ${data.errCode}: ${data.errMsg || data.errDlt}`);
  return data.data as T;
}

/** dev 签发本人 user token(admin token → get_user_token;正式改走后端)。 */
async function devIssueToken(userID: string): Promise<string> {
  const admin = await oimFetch<{ token: string }>("/auth/get_admin_token", { secret: DEV_SECRET, userID: "imAdmin" });
  // 确保用户已注册(幂等:已存在会报错,忽略)
  await oimFetch("/user/user_register", { users: [{ userID, nickname: `u${userID}`, faceURL: "" }] }, admin.token).catch(() => {});
  const u = await oimFetch<{ token: string }>("/auth/get_user_token", { platformID: PLATFORM_WEB, userID }, admin.token);
  return u.token;
}

/** 登录 OpenIM(幂等)。用当前登录用户 id;dev 内联签 token。 */
export async function ensureOpenImLogin(): Promise<void> {
  if (loggedIn) return;
  if (loginInFlight) return loginInFlight;
  loginInFlight = (async () => {
    const store = useUserStore();
    const userID = String(store.user.id || "");
    if (!userID) throw new Error("openim: not signed in");
    const token = await devIssueToken(userID);
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

/** 监听新消息(单聊文本)。返回取消函数。 */
export function onOimMessages(cb: (msg: MessageItem) => void): () => void {
  const handler = ({ data }: WsResponse<MessageItem[]>) => {
    for (const m of data || []) cb(m);
  };
  OpenIM.on(CbEvents.OnRecvNewMessages, handler as never);
  return () => OpenIM.off(CbEvents.OnRecvNewMessages, handler as never);
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
