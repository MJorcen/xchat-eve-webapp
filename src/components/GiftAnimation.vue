<template>
  <!-- MOCK: CSS 动画替代参考 SVGA 播放器（磁盘上无 .svga 礼物素材） -->
  <Transition name="gift-fade">
    <div v-if="anim.state.current" class="gift-overlay" aria-hidden="true">
      <div class="gift-stage">
        <span class="gift-face">{{ anim.state.current.gift.icon }}</span>
        <span v-for="i in 8" :key="i" class="spark" :class="`s${i}`" />
      </div>
      <p class="gift-caption">
        {{ anim.state.current.fromSelf ? "You sent" : "Received" }}
        {{ anim.state.current.gift.name }}
        <b>×{{ anim.state.current.count }}</b>
      </p>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import emitter from "../common/eventBus";
import { api } from "../services/api";
import { useGiftAnimation } from "../composables/useGiftAnimation";
import type { Gift } from "../types/eve";

const anim = useGiftAnimation();
let catalog: Gift[] = [];

// 收到他人礼物推送 → 解析礼物 → 播放
function onGiftReceived(p: { fromId: number; giftId: number; count: number }) {
  const gift = catalog.find((g) => g.id === p.giftId);
  if (gift) anim.play(gift, p.count, false);
}

onMounted(async () => {
  catalog = await api.getGifts();
  emitter.on("gift:received", onGiftReceived);
});

onUnmounted(() => {
  emitter.off("gift:received", onGiftReceived);
});
</script>

<style scoped>
.gift-overlay {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: min(400PX, 100vw);
  z-index: 3000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(3px);
  pointer-events: none;
}

.gift-stage {
  position: relative;
  display: grid;
  place-items: center;
}

.gift-face {
  font-size: 120px;
  line-height: 1;
  animation: gift-pop 1.8s ease-out forwards;
  filter: drop-shadow(0 8px 24px rgba(255, 84, 115, 0.5));
}

@keyframes gift-pop {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  18% {
    transform: scale(1.15);
    opacity: 1;
  }
  30% {
    transform: scale(1);
  }
  70% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateY(-44px) scale(0.96);
    opacity: 0;
  }
}

.spark {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  opacity: 0;
  animation: spark-burst 1.2s ease-out forwards;
}
.s1 { background: #ff5473; --x: 90px; --y: -70px; }
.s2 { background: #ffd36e; --x: -90px; --y: -60px; }
.s3 { background: #eb6300; --x: 100px; --y: 60px; }
.s4 { background: #00e397; --x: -100px; --y: 70px; }
.s5 { background: #ffd36e; --x: 0px; --y: -110px; }
.s6 { background: #ff5473; --x: 0px; --y: 110px; }
.s7 { background: #00e397; --x: 120px; --y: 0px; }
.s8 { background: #eb6300; --x: -120px; --y: 0px; }

@keyframes spark-burst {
  0% {
    transform: translate(0, 0) scale(0.4);
    opacity: 1;
  }
  100% {
    transform: translate(var(--x), var(--y)) scale(1);
    opacity: 0;
  }
}

.gift-caption {
  font-size: 15px;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
}
.gift-caption b {
  color: #ffd36e;
}

.gift-fade-enter-active,
.gift-fade-leave-active {
  transition: opacity 0.25s;
}
.gift-fade-enter-from,
.gift-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .gift-face {
    animation: none;
  }
  .spark {
    display: none;
  }
}
</style>
