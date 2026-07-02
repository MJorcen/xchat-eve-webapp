// 真实后端 HTTP 层：统一处理响应信封、登录态 token、登录失效跳转。
// 后端响应信封：{ status, msg, data, ... }，status === 0 | 200 视为成功；
// status === 1008（或 HTTP 401/403）表示登录态失效，清 token 并跳登录页。

import { useUserStore } from "@/stores";
import { buildPayloadHeader } from "@/utils/device";
import { parseJsonBigIntSafe } from "@/utils/safeJson";

// 与网关约定的前缀（dev 下由 Vite 代理转发到真实后端）。各服务路径形如 `/user/...`、`/item/...`。
const BASE = (import.meta.env.VITE_API_BASE as string) || "/api/v1";

export class ApiError extends Error {
  status: number;
  constructor(status: number, msg: string) {
    super(msg);
    this.name = "ApiError";
    this.status = status;
  }
}

interface ApiEnvelope<T> {
  status: number;
  msg?: string;
  data: T;
}

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Query;
  headers?: Record<string, string>;
  /** 是否附带 Authorization 头（默认 true；登录/注册等接口传 false）。 */
  auth?: boolean;
  /**
   * 后台增强型请求（登录后并行拉资料/钱包/关注数等，调用方本身已 .catch(()=>null) 容错）：
   * 401/1008 时只静默失败，不触发全局登出跳转。避免其中一路瞬时失效把刚登录成功、
   * 其余接口都正常的会话一并清空——真正的登录失效会在用户下一次主动请求时正常触发登出。
   */
  background?: boolean;
  /**
   * 用大整数安全解析响应体(把 19 位雪花 id 等 > 2^53 的整数解析成字符串,避免 JSON.parse 丢精度)。
   * 仅对会返回大 id 的接口(如 eve 通话 /connect/eve/*，其 record.id/eveId 是雪花 id)开启。
   */
  losslessJson?: boolean;
}

function buildUrl(path: string, query?: Query): string {
  let url = BASE.replace(/\/$/, "") + (path.startsWith("/") ? path : "/" + path);
  if (query) {
    const qs = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  }
  return url;
}

// 登录态失效：清空本地登录态并跳登录页（hash 路由，避免引入 router 造成循环依赖）。
function onUnauthorized() {
  try {
    useUserStore().logout();
  } catch {
    /* pinia 未就绪时忽略 */
  }
  if (typeof location !== "undefined" && !location.hash.startsWith("#/login")) {
    location.hash = "#/login";
  }
}

export async function request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, headers = {}, auth = true, background = false, losslessJson = false } = opts;

  const store = useUserStore();
  const finalHeaders: Record<string, string> = { Accept: "application/json", ...headers };
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isForm) finalHeaders["Content-Type"] = "application/json";
  // 后端上下文头（bundleId/deviceId/lang…），登录/注册也必须带（用于解析 AppPkg）。
  if (!("Payload" in finalHeaders)) finalHeaders["Payload"] = buildPayloadHeader(store.lang);
  if (auth && store.token) finalHeaders["Authorization"] = `Bearer ${store.token}`;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers: finalHeaders,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body)
    });
  } catch {
    throw new ApiError(-1, "网络异常，请稍后重试");
  }

  // HTTP 层登录态失效
  if (res.status === 401 || res.status === 403) {
    if (!background) onUnauthorized();
    throw new ApiError(res.status, "登录已失效，请重新登录");
  }

  let env: ApiEnvelope<T>;
  try {
    if (losslessJson) {
      const text = await res.text();
      env = (text ? parseJsonBigIntSafe(text) : {}) as ApiEnvelope<T>;
    } else {
      env = (await res.json()) as ApiEnvelope<T>;
    }
  } catch {
    throw new ApiError(res.status, `请求失败 (${res.status})`);
  }

  if (env.status === 0 || env.status === 200) return env.data;

  // 业务层登录态失效（JWT 过期/无效/被登出）
  if (env.status === 1008) {
    if (!background) onUnauthorized();
  }
  throw new ApiError(env.status, env.msg || `请求失败 (${env.status})`);
}

export const http = {
  get: <T>(path: string, query?: Query, opts?: RequestOptions) => request<T>(path, { ...opts, method: "GET", query }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>(path, { ...opts, method: "POST", body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>(path, { ...opts, method: "PUT", body }),
  del: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: "DELETE" })
};
