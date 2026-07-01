// 通话埋点(客户端独有点位:收到来电/授权/推拉调用/首帧/弱网/重连)。
// 服务端已记 createdAt/acceptTime/startTime/finishTime/seconds/finishType 等(见 docs §4.5),
// 客户端不重复;每条带 eveId,后端按 eveId join。字段说明见 docs §4.7。
// 上报默认仅 console.debug(dev);设 VITE_CALL_STAT=1 时批量 POST 到 VITE_CALL_STAT_PATH(失败丢弃)。
import { http } from "./http";

export type CallRole = "player" | "anchor";

export interface CallTelemetryCommon {
  eveId: number;
  rtcRoomId: string;
  callType: "Video" | "Audio";
  scene: string;
  role: CallRole;
  gender: string; // M | F
  direction: "out" | "in";
  selfUserId: number;
  peerUserId: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
let common: CallTelemetryCommon | null = null;
let traceId = "";
let seq = 0;
const marks: Record<string, number> = {};
const buffer: any[] = [];
let reconnectCount = 0;
let maxRttMs = 0;
let flushTimer: number | null = null;

const REPORT = import.meta.env.VITE_CALL_STAT === "1";
const REPORT_PATH = (import.meta.env.VITE_CALL_STAT_PATH as string) || "/connect/eve/stat";

function appInfo() {
  const n: any = typeof navigator !== "undefined" ? navigator : {};
  const conn = n.connection || {};
  return {
    platform: "h5",
    ver: (import.meta.env.VITE_APP_VER as string) || "0.0.0",
    net: conn.effectiveType || (n.onLine === false ? "offline" : "unknown"),
    ua: n.userAgent || ""
  };
}

/** 一通通话开始:设公共字段、清计数/缓冲/标记。 */
export function initCallTelemetry(c: CallTelemetryCommon): void {
  common = c;
  traceId = `call_${c.eveId || Date.now()}`;
  seq = 0;
  reconnectCount = 0;
  maxRttMs = 0;
  buffer.length = 0;
  for (const k of Object.keys(marks)) delete marks[k];
}

/** 结束:flush 后清空上下文。 */
export function clearCallTelemetry(): void {
  void flush();
  common = null;
}

/** 记录关键时刻(created/connect/playStart/down),供差值计算。 */
export function mark(name: string, ts: number = Date.now()): void {
  marks[name] = ts;
}

/** 通用打点:公共字段 + extra。无上下文时 no-op(非通话期)。 */
export function track(event: string, extra: Record<string, any> = {}, ts: number = Date.now()): void {
  if (!common) return;
  seq += 1;
  const rec = { traceId, ...common, event, ts, clientSeq: seq, app: appInfo(), ...extra };
  buffer.push(rec);
  if (import.meta.env.DEV) console.debug("[call-stat]", event, rec);
  scheduleFlush();
}

/** 首帧(秒开核心):本端拉到对端首帧。基于 marks 计算 sinceRequest/sincePlayStart/visibleCost。 */
export function trackFirstFrame(streamId: string, video?: any, rttMs?: number, renderCostMs?: number): void {
  if (!common) return;
  const ts = Date.now();
  const created = marks.created ?? marks.playStart;
  const connect = marks.connect;
  track(
    "first_frame",
    {
      streamId,
      sinceRequestMs: created ? ts - created : undefined,
      sincePlayStartMs: marks.playStart ? ts - marks.playStart : undefined,
      connectTs: connect,
      visibleCostMs: connect ? Math.max(0, ts - connect) : 0,
      video,
      rttMs,
      renderCostMs
    },
    ts
  );
}

/** 重连恢复:基于 marks.down 计算 recoverMs,累计 reconnectCount。 */
export function trackReconnect(scope: "room" | "stream", reason: string): void {
  const ts = Date.now();
  reconnectCount += 1;
  const down = marks.down;
  track("reconnect", { scope, reason, downTs: down, recoverMs: down ? ts - down : undefined, reconnectCount }, ts);
}

export function noteRtt(rtt: number): void {
  if (rtt > maxRttMs) maxRttMs = rtt;
}
export function getReconnectCount(): number {
  return reconnectCount;
}
export function getMaxRtt(): number {
  return maxRttMs;
}

function scheduleFlush(): void {
  if (!REPORT || flushTimer !== null) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flush();
  }, 3000);
}

async function flush(): Promise<void> {
  if (!REPORT || !buffer.length) return;
  const batch = buffer.splice(0, buffer.length);
  try {
    await http.post(REPORT_PATH, { events: batch });
  } catch {
    /* 上报失败丢弃,不影响通话 */
  }
}
