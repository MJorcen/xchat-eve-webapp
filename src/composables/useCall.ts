import { computed, reactive } from "vue";
import type { Anchor } from "../types/eve";
import emitter from "../common/eventBus";
import { requestCall, acceptCall, rejectCall, cancelCall, endCall, type EveContext } from "../services/call";
import { onEveSignal, ensureImLogin } from "../services/im";
import { setMicEnabled, setCameraEnabled } from "../services/zego";

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
  eveId: 0
});

// 当前通话的 ZEGO 凭证(rtcRoomId/rtcToken/playerStreamId/anchorStreamId);CallPage 据此入房推拉流。
let eveContext: EveContext | null = null;
let timer: number | null = null;
let signalStop: (() => void) | null = null;

export function getEveContext(): EveContext | null {
  return eveContext;
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
  resetState();
  state.phase = "ringing";
  state.target = anchor;
  state.free = free;
  try {
    const ctx = await requestCall(anchor.id);
    eveContext = ctx;
    state.eveId = ctx.record?.id ?? 0;
  } catch (e) {
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
    } catch {
      reject();
      return;
    }
  }
  state.phase = "active";
  state.seconds = 0;
  startTicking();
}

function reject() {
  if (state.eveId) rejectCall(state.eveId).catch(() => {});
  clearTimers();
  state.phase = "ended";
  state.endReason = "rejected";
}

function hangup() {
  const anchor = state.target;
  const duration = state.seconds;
  // ringing 阶段(对端未接)= 取消;否则 = 挂断
  if (state.eveId) {
    if (state.phase === "ringing") cancelCall(state.eveId).catch(() => {});
    else endCall(state.eveId, 2).catch(() => {});
  }
  clearTimers();
  state.phase = "ended";
  if (anchor) emitter.emit("call:hangup", { anchor, duration });
}

// eve 信令 → 状态机
function handleSignal(sig: { messageType: string; content: any; sender?: any }) {
  const c = sig.content || {};
  const s = sig.sender || {};
  switch (sig.messageType) {
    case "eve_invite": {
      if (state.phase !== "idle" && state.phase !== "ended") return; // 忙线
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
      receiveIncoming(caller, false, c.eveId || 0);
      break;
    }
    case "eve_accept": // 对端接听
      if (state.phase === "ringing") {
        state.phase = "active";
        state.seconds = 0;
        startTicking();
      }
      break;
    case "eve_reject":
      clearTimers();
      state.phase = "ended";
      state.endReason = "rejected";
      break;
    case "eve_cancel": // 主叫取消(响铃中)
      if (state.phase === "incoming") {
        clearTimers();
        state.phase = "ended";
        state.endReason = "canceled";
      }
      break;
    case "eve_finish":
      clearTimers();
      state.phase = "ended";
      if (c.duration != null) state.seconds = c.duration;
      break;
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
    reset: resetState,
    addGiftCost,
    toggleMic,
    toggleCamera,
    switchCamera,
    // 兼容旧调用点:openCall 直接发起去电
    openCall: (anchor: Anchor) => startOutgoing(anchor)
  };
}
