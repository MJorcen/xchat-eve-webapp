// 业务无关的可重入占用锁(对外只有 0/1)。状态机/通话/支付都不在锁里 —— 锁只管「占用与否」。
// 设计见 docs/RTC-通话状态机与占用锁.md。
//   acquire()        仅空闲(0)可得 → 1;返回令牌(= fencing token)
//   reenter(token)   出示有效令牌(证明在占用内)→ 追加一个 hold,状态仍 1(in-call 充值用)
//   release(token)   移除该 hold;归零 → 0
//   isLocked()       0/1 真值
//   reconcile()      立即跑所有 check(),死的移除(用户主动操作前调 = 自我订正)
//   forceClear()     无条件清空(清空按钮/逃生),逐个回调 onForceClear
//   tick()           每 5s:reconcile + 软过期回收 + 存活续命(防业务忘了 release 的泄漏)
// sourceType/sourceId 仅日志,不参与逻辑。check 全本地(在通话页? 流还在? 在充值页?)。

export interface AcquireOpts {
  /** 仅日志/排查,不参与逻辑 */
  sourceType?: string;
  sourceId?: string;
  /** 本地存活探针:true 续命 / false 释放。必填。 */
  check: () => boolean;
  /** 软过期,默认 30s;tick 在 check 通过时续命 */
  ttlMs?: number;
  /** forceClear 时联动外部清理(leaveRoom / resetState 等) */
  onForceClear?: () => void;
}

interface Hold {
  token: symbol;
  sourceType: string;
  sourceId: string;
  check: () => boolean;
  ttlMs: number;
  expireAt: number;
  onForceClear?: () => void;
}

const TICK_MS = 5000;
const DEFAULT_TTL = 30000;

let holds: Hold[] = [];
let tickTimer: number | null = null;

function now(): number {
  return Date.now();
}

function log(action: string, h?: Hold): void {
  if (import.meta.env.DEV) {
    console.debug(`[busyLock] ${action}`, h ? `${h.sourceType}:${h.sourceId}` : `holds=${holds.length}`);
  }
}

function mkHold(opts: AcquireOpts): Hold {
  const ttlMs = opts.ttlMs ?? DEFAULT_TTL;
  return {
    token: Symbol("hold"),
    sourceType: opts.sourceType || "",
    sourceId: opts.sourceId || "",
    check: opts.check,
    ttlMs,
    expireAt: now() + ttlMs,
    onForceClear: opts.onForceClear
  };
}

function ensureTick(): void {
  if (tickTimer !== null) return;
  tickTimer = window.setInterval(() => {
    reconcile();
    if (holds.length === 0) stopTick();
  }, TICK_MS);
}
function stopTick(): void {
  if (tickTimer !== null) {
    window.clearInterval(tickTimer);
    tickTimer = null;
  }
}

/** 立即核对:跑每个 hold 的 check(),死的(或过期的)移除,存活的续命。 */
export function reconcile(): void {
  const t = now();
  holds = holds.filter((h) => {
    if (t > h.expireAt) {
      log("expire", h);
      return false;
    }
    let ok = true;
    try {
      ok = h.check() !== false;
    } catch {
      ok = true; // check 抛错保守视为活,不误清
    }
    if (ok) h.expireAt = t + h.ttlMs;
    else log("check-dead", h);
    return ok;
  });
}

/** 0/1 真值。读前清掉过期项(不跑 check,廉价)。 */
export function isLocked(): boolean {
  const t = now();
  holds = holds.filter((h) => t <= h.expireAt);
  return holds.length > 0;
}

/** 独占获取:先 reconcile(自我订正),仍占用则 null(忙);否则注册首个 hold。 */
export function acquire(opts: AcquireOpts): symbol | null {
  reconcile();
  if (holds.length > 0) {
    log("acquire-busy");
    return null;
  }
  const h = mkHold(opts);
  holds.push(h);
  ensureTick();
  log("acquire", h);
  return h.token;
}

/** 重入:出示当前有效令牌(证明在占用内)→ 追加一个 hold;令牌已失效则 null。 */
export function reenter(token: symbol | null, opts: AcquireOpts): symbol | null {
  isLocked(); // 清过期
  if (!token || !holds.some((h) => h.token === token)) {
    log("reenter-invalid");
    return null;
  }
  const h = mkHold(opts);
  holds.push(h);
  log("reenter", h);
  return h.token;
}

/** 释放某个 hold;归零则解锁。token 为 null 或已不在表中则无副作用(迟到的旧操作天然失效)。 */
export function release(token: symbol | null): void {
  if (!token) return;
  const before = holds.length;
  holds = holds.filter((h) => h.token !== token);
  if (holds.length !== before) log("release");
  if (holds.length === 0) stopTick();
}

/** 无条件清空所有 hold,逐个回调 onForceClear(清空按钮 / 卡死逃生)。 */
export function forceClear(): void {
  const snapshot = holds.slice();
  holds = [];
  stopTick();
  log("forceClear");
  for (const h of snapshot) {
    try {
      h.onForceClear?.();
    } catch {
      /* ignore */
    }
  }
}

/** 调试用:当前持有快照(只读)。 */
export function holdsSnapshot(): { sourceType: string; sourceId: string }[] {
  return holds.map((h) => ({ sourceType: h.sourceType, sourceId: h.sourceId }));
}
