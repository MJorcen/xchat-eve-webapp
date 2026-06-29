// 客户端设备密钥：首次访问生成一次并持久化，作为「设备快捷登录」的唯一身份
// （对应后端 UserAuth.identityKey，provider=device）。清了 localStorage 等于换新设备/新账号。

const DEVICE_ID_KEY = "eve_device_id";

/** 取持久化设备密钥，没有则生成并写入 localStorage。 */
export function getDeviceId(): string {
  let id = "";
  try {
    id = localStorage.getItem(DEVICE_ID_KEY) || "";
  } catch {
    /* localStorage 不可用：每次新建，退化为会话内有效 */
  }
  if (!id) {
    id = genUuid();
    try {
      localStorage.setItem(DEVICE_ID_KEY, id);
    } catch {
      /* 写入失败（隐私模式/超额）：忽略，本次会话仍可用 */
    }
  }
  return id;
}

/** 设备品牌/型号：后端可选字段，仅用于风控与统计。Web 端给出近似值。 */
export function getDeviceMeta(): { brand: string; model: string } {
  const nav = typeof navigator !== "undefined" ? navigator : ({} as Navigator);
  return {
    brand: nav.vendor || "web",
    model: nav.platform || "H5"
  };
}

// 后端从 `Payload` 请求头解析 bundleId/deviceId/appVersion/lang 等上下文（URL 查询串格式）。
// bundleId 用于解析 AppPkg —— 缺失或非法会导致登录/注册报 invalid_request_data。
export function buildPayloadHeader(lang: string): string {
  const params: Record<string, string> = {
    deviceId: getDeviceId(),
    bundleId: (import.meta.env.VITE_APP_BUNDLE_ID as string) || "com.xworldcc.android.dev",
    appVersion: "1.0.0",
    platform: "Android",
    lang,
    locale: lang,
    channel: "OFFICIAL"
  };
  return Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
}

function genUuid(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  // 兜底（非安全上下文无 crypto.randomUUID 时）
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
