import { computed, reactive } from "vue";
import type { Anchor } from "../types/eve";
import emitter from "../common/eventBus";
import {
  requestCall,
  acceptCall,
  rejectCall,
  cancelCall,
  endCall,
  type EveContext,
  type EveRecord
} from "../services/call";
import { onEveSignal, ensureImLogin, type EveSignal } from "../services/im";
import { setMicEnabled, setCameraEnabled, joinRoom, prewarmPull, leaveRoom } from "../services/zego";
import {
  initCallTelemetry,
  clearCallTelemetry,
  mark,
  track,
  getReconnectCount,
  getMaxRtt,
  type CallRole,
  type CallTelemetryCommon
} from "../services/callTelemetry";
import { acquire, release, forceClear } from "../services/busyLock";
import { useUserStore } from "../stores";

// 通话生命周期状态机:单例 reactive,CallModal / CallPage / CallSummary 共享。
// 真实后端 /connect/eve/*(EveContext)+ ZEGO 媒体 + 网易 eve 信令驱动。
// idle → incoming(来电)/ ringing(去电拨号)→ active(通话中)→ ended(结束)
// 计费由后端定时器完成(100 钻/分);客户端只展示时长。
export type CallPhase = "idle" | "incoming" | "ringing" | "active" | "ended";

type CallState = {
  phase: CallPhase;
  target: Anchor | null;
  free: boolean;
  micOn: boolean;
  cameraOn: boolean;
  frontCamera: boolean;
  seconds: number;
  coinCost: number;
  giftCost: number;
  endReason: string | null;
  eveId: number; // 后端通话记录 id(0=无真实通话/兜底)
  role: CallRole; // 本端角色:player(男,早拉晚推)/ anchor(女,早推)
  direction: "out" | "in"; // 主叫 out / 被叫 in
};

const state = reactive<CallState>({
  phase: "idle",
  target: null,
  free: false,
  micOn: true,
  cameraOn: true,
  frontCamera: true,
  seconds: 0,
  coinCost: 0,
  giftCost: 0,
  endReason: null,
  eveId: 0,
  role: "player",
  direction: "out"
});

// 埋点辅助:角色按性别定(M→player F→anchor),有 record 时以 playerUserId 为准。
let inviteRecvTs = 0; // 收到来电时刻(算 ringMs)
let endTracked = false; // 防重复 end 打点

function selfId(): number {
  try {
    return Number(useUserStore().user.id) || 0;
  } catch {
    return 0;
  }
}
function genderOf(): string {
  try {
    return String(useUserStore().user.gender ?? "");
  } catch {
    return "";
  }
}
// 角色 = 主叫/被叫(后端 playerUserId=主叫 fromUserId,anchorUserId=被叫 toUserId),**非性别**。
// 本 app 用户恒为男(秒开主体):无论主叫/被叫都「早拉对端、晚推自己」。role 仅用于选 self/peer streamId + 埋点。
function roleFrom(rec?: EveRecord): CallRole {
  const id = selfId();
  if (rec?.anchorUserId && id && id === rec.anchorUserId) return "anchor"; // 被叫
  return "player"; // 主叫(默认)
}
function buildCommon(
  eveId: number,
  rtcRoomId: string,
  role: CallRole,
  direction: "out" | "in",
  peerUserId: number
): CallTelemetryCommon {
  return {
    eveId,
    rtcRoomId,
    callType: "Video",
    scene: "none",
    role,
    gender: genderOf() || "",
    direction,
    selfUserId: selfId(),
    peerUserId
  };
}
function trackEnd(finishType: number, by: "self" | "peer" | "system", source: "local" | "signal") {
  if (endTracked) return;
  endTracked = true;
  track("end", {
    finishType,
    by,
    source,
    talkMs: state.seconds * 1000,
    reconnectCount: getReconnectCount(),
    maxRttMs: getMaxRtt()
  });
  clearCallTelemetry();
}

// 当前通话的 ZEGO 凭证(rtcRoomId/rtcToken/playerStreamId/anchorStreamId);CallPage 据此入房推拉流。
let eveContext: EveContext | null = null;
let timer: number | null = null;
let ringGuard: number | null = null; // 振铃超时安全网(信令丢失兜底)
let signalStop: (() => void) | null = null;
// 占用锁令牌(本通话持有 busyLock 的 hold);CallPage 充值浮层据此 reenter。
let lockToken: symbol | null = null;

// 振铃超时:略大于后端 RING_TIMEOUT(30s),正常情况下后端 cancel 信令先到;仅信令丢失时本地兜底结束。
const RING_GUARD_MS = 40000;

export function getEveContext(): EveContext | null {
  return eveContext;
}
export function getCallLockToken(): symbol | null {
  return lockToken;
}

// 通话锁的本地存活探针:phase 处于 incoming/ringing/active 即「通话还在」。
// busyLock 用它自愈(漏信令/忘释放时,5s tick 或用户主动操作的 reconcile 会发现 phase 已 idle/ended 而释放)。
function callAlive(): boolean {
  return state.phase === "incoming" || state.phase === "ringing" || state.phase === "active";
}

// 统一终态收口:释放锁 → 清定时器 → 退 ZEGO 房 → (可选)调后端 → 埋点 end → phase=ended。
// 所有终态(本端 reject/hangup、对端 reject/cancel/end、超时)都走它 → 锁必释放、ZEGO 必清、埋点一次、状态一致。
function finishLocal(
  finishType: number,
  by: "self" | "peer" | "system",
  source: "local" | "signal",
  opts?: { endReason?: string; duration?: number; backend?: () => void }
) {
  if (opts?.backend) {
    try {
      opts.backend();
    } catch {
      /* 后端调用失败不阻断本地终态 */
    }
  }
  release(lockToken);
  lockToken = null;
  clearTimers();
  void leaveRoom();
  if (opts?.duration != null) state.seconds = opts.duration;
  trackEnd(finishType, by, source);
  state.phase = "ended";
  if (opts?.endReason) state.endReason = opts.endReason;
}

// 忙线/支付期收到来电 → 自动以「拒接」回掉新来电(主叫不空响;后端占线通常已拦,这是兜底)。
function autoRejectBusy(eveId: number) {
  if (eveId) rejectCall(eveId).catch(() => {});
}

// 清空按钮 / 卡死逃生:强清锁(onForceClear 里已 leaveRoom)+ 复位状态机到 idle。
export function resetAll() {
  forceClear();
  lockToken = null;
  resetState();
}

function fmt(total: number) {
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}
const elapsed = computed(() => fmt(state.seconds));

function clearTimers() {
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
  clearRingGuard();
}

function clearRingGuard() {
  if (ringGuard !== null) {
    window.clearTimeout(ringGuard);
    ringGuard = null;
  }
}

// 进入 ringing/incoming 时启动:超时仍未接通则本地结束(后端 cancel 信令丢失的兜底)。
function startRingGuard() {
  clearRingGuard();
  ringGuard = window.setTimeout(() => {
    if (state.phase !== "ringing" && state.phase !== "incoming") return;
    const ringing = state.phase === "ringing";
    finishLocal(ringing ? 1 : 5, "system", "local", {
      endReason: ringing ? "no_answer" : "missed",
      backend: () => {
        if (!state.eveId) return;
        if (ringing) cancelCall(state.eveId).catch(() => {});
        else rejectCall(state.eveId).catch(() => {});
      }
    });
  }, RING_GUARD_MS);
}

function startTicking() {
  clearTimers();
  timer = window.setInterval(() => {
    if (!document.hidden) state.seconds += 1;
  }, 1000);
}

function resetState() {
  clearTimers();
  eveContext = null;
  state.phase = "idle";
  state.target = null;
  state.free = false;
  state.micOn = true;
  state.cameraOn = true;
  state.frontCamera = true;
  state.seconds = 0;
  state.coinCost = 0;
  state.giftCost = 0;
  state.endReason = null;
  state.eveId = 0;
  state.role = "player";
  state.direction = "out";
  endTracked = false;
}

// 来电(由 eve_invite 信令触发;也兼容外部 mock 调用)
function receiveIncoming(anchor: Anchor, free = false, eveId = 0) {
  if (state.phase !== "idle" && state.phase !== "ended") return;
  resetState();
  state.phase = "incoming";
  state.target = anchor;
  state.free = free;
  state.eveId = eveId;
}

// 去电:请求后端 → 拿 EveContext(房间/token)→ ringing;对端接听由 eve_accept 信令转 active
async function startOutgoing(anchor: Anchor, free = false) {
  // 先抢锁:acquire 内部 reconcile 自我订正(陈旧锁清掉);仍占用(真有通话/支付中)→ 拒,不动现有状态
  const t = acquire({ sourceType: "call", sourceId: String(anchor.id), check: callAlive, onForceClear: () => void leaveRoom() });
  if (!t) {
    emitter.emit("toast", "忙线中,请稍后再拨");
    return;
  }
  resetState();
  lockToken = t;
  state.phase = "ringing";
  state.target = anchor;
  state.free = free;
  state.direction = "out";
  const dialTs = Date.now();
  try {
    const ctx = await requestCall(anchor.id);
    eveContext = ctx;
    state.eveId = ctx.record?.id ?? 0;
    state.role = roleFrom(ctx.record);
    initCallTelemetry(buildCommon(state.eveId, ctx.rtcRoomId, state.role, "out", anchor.id));
    mark("created", dialTs); // 拨号时刻(服务端 createdAt 更准,后端 join 校正)
    startRingGuard(); // 振铃超时兜底
  } catch (e) {
    release(lockToken); // 发起失败 → 释放锁
    lockToken = null;
    state.phase = "ended";
    state.endReason = "failed";
    emitter.emit("toast", (e as Error)?.message || "Call failed");
  }
}

// 接听(被叫):请求后端 accept 拿被叫 EveContext → active
async function accept() {
  if (!state.target) return;
  if (state.eveId) {
    try {
      eveContext = await acceptCall(state.eveId);
      state.role = roleFrom(eveContext.record); // 拿到完整 record 后校正角色
    } catch {
      reject();
      return;
    }
  }
  mark("connect");
  track("accept", { ringMs: inviteRecvTs ? Date.now() - inviteRecvTs : undefined });
  state.phase = "active";
  state.seconds = 0;
  startTicking();
}

function reject() {
  track("reject", { ringMs: inviteRecvTs ? Date.now() - inviteRecvTs : undefined, optType: 6 });
  finishLocal(6, "self", "local", {
    endReason: "rejected",
    backend: () => {
      if (state.eveId) rejectCall(state.eveId).catch(() => {});
    }
  });
}

function hangup() {
  const anchor = state.target;
  const duration = state.seconds;
  // ringing 阶段(对端未接)= 取消;否则 = 挂断
  if (state.phase === "ringing") {
    track("cancel", { optType: 5 });
    finishLocal(5, "self", "local", {
      endReason: "canceled",
      backend: () => {
        if (state.eveId) cancelCall(state.eveId).catch(() => {});
      }
    });
  } else {
    const optType = state.role === "anchor" ? 3 : 2; // 2 主叫挂 / 3 被叫挂
    finishLocal(optType, "self", "local", {
      backend: () => {
        if (state.eveId) endCall(state.eveId, optType).catch(() => {});
      }
    });
  }
  if (anchor) emitter.emit("call:hangup", { anchor, duration });
}

// 离开通话页但未显式挂断(返回 / 跳去充值)→ 静默结束当前通话(释放锁 + 通知后端),不跳结算页。
// 修掉「离开通话页只断媒体、后端通话还在跑计费」的老问题;已是 ended/idle 时无副作用。
function leaveCall() {
  if (state.phase === "ringing") {
    finishLocal(5, "self", "local", {
      endReason: "canceled",
      backend: () => {
        if (state.eveId) cancelCall(state.eveId).catch(() => {});
      }
    });
  } else if (state.phase === "active") {
    const optType = state.role === "anchor" ? 3 : 2;
    finishLocal(optType, "self", "local", {
      backend: () => {
        if (state.eveId) endCall(state.eveId, optType).catch(() => {});
      }
    });
  }
}

// eve 信令 → 状态机
function handleSignal(sig: EveSignal) {
  const c = sig.content || {};
  const s = sig.sender || {};
  switch (sig.messageType) {
    case "call_eve/request": {
      const eveId = c.eveId || 0;
      // 抢锁(acquire 内部 reconcile 自我订正);忙(通话/支付中)→ 自动拒掉新来电,不打断当前
      const t = acquire({ sourceType: "call", sourceId: String(eveId), check: callAlive, onForceClear: () => void leaveRoom() });
      if (!t) {
        autoRejectBusy(eveId);
        return;
      }
      const caller: Anchor = {
        id: s.id || c.fromUserId || 0,
        nickname: s.nickname || "",
        avatar: s.avatar || "",
        age: 0,
        region: "",
        online: true,
        onDuty: true,
        intro: "",
        followers: 0,
        price: 0,
        tags: []
      };
      receiveIncoming(caller, false, eveId);
      lockToken = t;
      // 被叫 = anchor(后端 anchorUserId=toUserId)。
      inviteRecvTs = Date.now();
      state.role = "anchor";
      state.direction = "in";
      initCallTelemetry(buildCommon(eveId, c.rtcRoomId || "", state.role, "in", caller.id));
      mark("created", inviteRecvTs);
      track("request_received", {
        fromUserId: caller.id,
        channel: "nim",
        appState: typeof document !== "undefined" && document.hidden ? "background" : "foreground",
        hasRtcInfo: !!sig.rtcInfo, // 验后端 payload 补齐是否到位
        hasRtcConfig: !!sig.rtcConfig
      });
      // 偷跑:收到来电即后台预入房 + 预拉对端流(用信令带的 anchorToken),accept 时画面已就绪
      void prewarmIncoming(sig);
      startRingGuard(); // 来电超时兜底(无人接/被取消信令丢失)
      break;
    }
    case "call_eve/accept": // 对端接听(主叫侧接通)
      if (state.phase === "ringing") {
        mark("connect");
        state.phase = "active";
        state.seconds = 0;
        startTicking();
      }
      break;
    case "call_eve/reject":
      finishLocal(6, "peer", "signal", { endReason: "rejected" });
      break;
    case "call_eve/cancel":
      // 被叫(incoming)收 = 主叫取消;主叫(ringing)收 = 后端未接通超时 → 两者都结束
      if (state.phase === "incoming") {
        finishLocal(5, "peer", "signal", { endReason: "canceled" });
      } else if (state.phase === "ringing") {
        finishLocal(1, "peer", "signal", { endReason: "no_answer" });
      }
      break;
    case "call_eve/end":
      finishLocal(state.role === "anchor" ? 2 : 3, "peer", "signal", {
        duration: c.duration != null ? c.duration : undefined
      });
      break;
  }
}

// 被叫偷跑:收到 call_eve/request 即后台预入房 + 预拉对端流(不预推,推流后置到接通)。
// 用信令带的 rtcInfo(anchorToken 是被叫 token,playerStreamId 是主叫流);后端未补 rtcInfo 则跳过,走 accept 后正常入房。
async function prewarmIncoming(sig: EveSignal) {
  const myToken = lockToken; // 捕获本通话令牌(fencing):期间被 reject/cancel 或被新通话取代,令牌会变
  const info = sig.rtcInfo;
  const room = sig.content?.rtcRoomId;
  if (!info || !room || !myToken) return;
  const selfToken = info.anchorToken; // 被叫 = anchor
  const peerStreamId = info.playerStreamId; // 对端(主叫)流
  if (!selfToken || !peerStreamId) return;
  try {
    // 只预入房 + 预拉对端(秒开关键),不预采集本地 —— 男端推流后置到接通,
    // 避免响铃期就点亮摄像头(本地采集留给 CallPage,接通后再推)
    const ok = await joinRoom(room, selfToken, String(selfId()), "invite");
    if (lockToken !== myToken) {
      void leaveRoom(); // 期间已终态 → 撤销偷跑,不留悬挂
      return;
    }
    if (ok) await prewarmPull(peerStreamId); // 预拉对端流;接通(CallPage)时 view 直接贴容器秒显
    if (lockToken !== myToken) void leaveRoom();
  } catch {
    /* 偷跑失败不影响 accept 后正常入房推拉 */
  }
}

/** 注册 eve 通话信令监听(app 启动后调一次;依赖 NIM 已登录)。 */
export async function startCallSignals(): Promise<void> {
  if (signalStop) return;
  try {
    await ensureImLogin();
  } catch {
    /* NIM 未就绪,稍后页面再登 */
  }
  signalStop = onEveSignal(handleSignal);
}

function addGiftCost(value: number) {
  state.giftCost += value;
}
function toggleMic() {
  state.micOn = !state.micOn;
  setMicEnabled(state.micOn);
}
function toggleCamera() {
  state.cameraOn = !state.cameraOn;
  setCameraEnabled(state.cameraOn);
}
function switchCamera() {
  state.frontCamera = !state.frontCamera;
  emitter.emit("toast", "Camera switched");
}

export function useCall() {
  return {
    callState: state,
    elapsed,
    getEveContext,
    receiveIncoming,
    startOutgoing,
    accept,
    reject,
    hangup,
    leaveCall, // 离开通话页(返回/跳充值)→ 静默结束 + 释放锁
    reset: resetState,
    resetAll, // 清空按钮 / 卡死逃生:强清锁 + 复位
    addGiftCost,
    toggleMic,
    toggleCamera,
    switchCamera,
    // 兼容旧调用点:openCall 直接发起去电
    openCall: (anchor: Anchor) => startOutgoing(anchor)
  };
}
