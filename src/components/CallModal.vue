<template>
  <div v-if="ringing" class="call-modal">
    <img class="bg" :src="callState.target?.avatar" alt="" />
    <div class="scrim" />

    <div class="caller">
      <img class="avatar" :src="callState.target?.avatar" alt="" />
      <h2 class="name">{{ callState.target?.nickname }}</h2>
      <div class="subline">
        <span v-if="callState.free" class="free-pill">Free ×3</span>
        <span v-else class="price">
          <img src="/assets/eve/callDialog/coin_300@2x.png" alt="" />
          {{ callState.target?.price }}/min
        </span>
      </div>
      <p class="hint">
        {{ callState.phase === "incoming" ? "invites you to a video call…" : "Calling…" }}
      </p>
    </div>

    <div class="controls">
      <button class="btn decline" @click="onDecline">
        <img src="/assets/eve/callDialog/ic_phone-hangup@2x.png" alt="" />
      </button>
      <button v-if="callState.phase === 'incoming'" class="btn accept" @click="onAccept">
        <img src="/assets/eve/callDialog/ic_phone-answer_l@2x.png" alt="" />
      </button>
    </div>

    <audio ref="ringEl" src="/assets/eve/call.mp3" loop />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import emitter from "../common/eventBus";
import { useCall } from "../composables/useCall";
import type { Anchor } from "../types/eve";

const router = useRouter();
const { callState, receiveIncoming, accept, reject, reset } = useCall();

const ringEl = ref<HTMLAudioElement | null>(null);
const ringing = computed(() => callState.phase === "incoming" || callState.phase === "ringing");

function onIncoming(p: { anchor: Anchor; free?: boolean }) {
  receiveIncoming(p.anchor, !!p.free);
}

function onAccept() {
  // accept() 将 phase 置为 active，下方 phase watcher 统一负责跳转 /call/:id（唯一导航出口）
  accept();
}

function onDecline() {
  reject();
  reset();
}

// 振铃音效随 ringing 状态播放/停止
watch(ringing, (v) => {
  const el = ringEl.value;
  if (!el) return;
  if (v) {
    el.currentTime = 0;
    el.play().catch(() => {});
  } else {
    el.pause();
  }
});

// 去电自动接通后（phase → active）跳转通话页
watch(
  () => callState.phase,
  (phase) => {
    if (phase === "active" && callState.target && router.currentRoute.value.name !== "Call") {
      router.push(`/call/${callState.target.id}`);
    }
  }
);

onMounted(() => emitter.on("call:incoming", onIncoming));
onUnmounted(() => emitter.off("call:incoming", onIncoming));
</script>

<style scoped>
.call-modal {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: min(400PX, 100vw);
  z-index: 9920;
  overflow: hidden;
  background: #2c1a1a;
}

.bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.6);
}

.scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 0.7) 100%);
}

.caller {
  position: absolute;
  top: 18%;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid rgba(255, 84, 115, 0.7);
  box-shadow: 0 0 30px rgba(255, 84, 115, 0.5);
}

.name {
  margin: 16px 0 10px;
  font-size: 22px;
  font-weight: 700;
  color: #fff;
}

.subline {
  margin-bottom: 8px;
}

.free-pill {
  padding: 4px 14px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(90deg, #ff5473, #eb6300);
}

.price {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  color: #ffd36e;
  img {
    width: 18px;
    height: 18px;
  }
}

.hint {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.controls {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 72px;
  display: flex;
  justify-content: center;
  gap: 64px;
}

.btn {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  img {
    width: 34px;
    height: 34px;
  }
}

.decline {
  background: #4a3132;
}

.accept {
  background: #00c46a;
  animation: pulse-accept 1.2s ease-in-out infinite;
}

@keyframes pulse-accept {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.08);
  }
}
</style>
