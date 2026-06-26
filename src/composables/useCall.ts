import { computed, reactive } from "vue";
import type { Anchor } from "../types/eve";
import emitter from "../common/eventBus";
import { useUserStore } from "../stores";

// 通话生命周期状态机（mock）：单例 reactive，CallModal / CallPage / CallSummary / realtime 共享同一份状态。
// idle → incoming（来电响铃）/ ringing（去电拨号）→ active（通话中）→ ended（结束结算）
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
  endReason: null
});

let timer: number | null = null;
let ringTimer: number | null = null;

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
  if (ringTimer !== null) {
    window.clearTimeout(ringTimer);
    ringTimer = null;
  }
}

function startTicking() {
  clearTimers();
  const userStore = useUserStore();
  timer = window.setInterval(() => {
    if (document.hidden) return;
    state.seconds += 1;
    // 付费通话按分钟计费：每跨过一分钟边界扣一次费
    if (!state.free && state.target && state.seconds % 60 === 0) {
      const price = state.target.price;
      if (userStore.coins < price) {
        emitter.emit("toast", "Insufficient coins");
        hangup();
        return;
      }
      userStore.addCoins(-price);
      state.coinCost += price;
    }
  }, 1000);
}

function resetState() {
  clearTimers();
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
}

// 来电（realtime 模拟推送触发）
function receiveIncoming(anchor: Anchor, free = false) {
  // 仅在空闲/已结束时接受新来电，避免覆盖正在响铃的来电或去电
  if (state.phase !== "idle" && state.phase !== "ended") return;
  resetState();
  state.phase = "incoming";
  state.target = anchor;
  state.free = free;
}

// 去电（用户从主播主页 / 聊天页发起）
function startOutgoing(anchor: Anchor, free = false) {
  resetState();
  state.phase = "ringing";
  state.target = anchor;
  state.free = free;
  // mock：约 2s 后对方接听
  ringTimer = window.setTimeout(() => {
    if (state.phase === "ringing") accept();
  }, 2000);
}

function accept() {
  if (!state.target) return;
  state.phase = "active";
  state.seconds = 0;
  startTicking();
}

function reject() {
  state.phase = "ended";
  state.endReason = "rejected";
  clearTimers();
}

function hangup() {
  const anchor = state.target;
  const duration = state.seconds;
  clearTimers();
  state.phase = "ended";
  if (anchor) emitter.emit("call:hangup", { anchor, duration });
}

function addGiftCost(value: number) {
  state.giftCost += value;
}

function toggleMic() {
  state.micOn = !state.micOn;
}
function toggleCamera() {
  state.cameraOn = !state.cameraOn;
}
function switchCamera() {
  state.frontCamera = !state.frontCamera;
  emitter.emit("toast", "Camera switched");
}

export function useCall() {
  return {
    callState: state,
    elapsed,
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
    // 兼容旧调用点：openCall 直接发起去电
    openCall: (anchor: Anchor) => startOutgoing(anchor)
  };
}
