<template>
  <section v-if="anchor" class="match-deck">
    <!-- 满屏背景人像 -->
    <van-image :key="anchor.id" fit="cover" class="bg" :src="anchor.avatar" lazy-load />
    <div class="scrim" />

    <!-- 顶部:返回 / 标题 / 举报 -->
    <header class="bar">
      <button class="icon-btn" @click="exit"><ChevronLeft :size="22" :stroke-width="2.2" /></button>
      <span class="title">{{ t("matchDetail.title") }}</span>
      <button class="icon-btn" @click="report"><Flag :size="19" :stroke-width="2" /></button>
    </header>

    <div class="spacer" />

    <!-- 资料 -->
    <div :key="anchor.id" class="info">
      <span v-if="likedYou" class="liked-badge"><Heart :size="12" fill="currentColor" :stroke-width="0" /> {{ t("matchDetail.likedYou") }}</span>
      <div class="name-row">
        <span v-if="anchor.online" class="dot" />
        <strong class="name">{{ anchor.nickname }}</strong>
        <span class="age">{{ anchor.age }}</span>
        <img class="flag" :src="countryFlag(anchor.region)" alt="" />
      </div>
      <p class="bio">{{ anchor.intro }}</p>
    </div>

    <!-- 底部操作区 -->
    <div class="dock">
      <div class="countdown">
        <i :style="{ width: progress + '%' }" />
      </div>
      <p class="auto-tip">{{ t("matchDetail.autoNext", { remain }) }}</p>

      <button class="connect" @click="connect">
        <Video :size="20" :stroke-width="2.2" />
        {{ t("matchDetail.videoCall") }}
      </button>
      <button class="next" @click="goNext">{{ t("matchDetail.next") }} ›</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { ChevronLeft, Flag, Video, Heart } from "lucide-vue-next";
import emitter from "../common/eventBus";
import { api } from "../services/api";
import { useCall } from "../composables/useCall";
import { useUserStore } from "../stores";
import { countryFlag } from "../utils/assets";
import type { Anchor } from "../types/eve";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { startOutgoing } = useCall();
const userStore = useUserStore();

const cost = route.query.type === "Goddess" ? 500 : 300;
const SECS = 12;

let pool: Anchor[] = [];
const anchor = ref<Anchor | null>(null);
const likedYou = ref(false);
const progress = ref(100);
let timer: number | null = null;

const remain = computed(() => Math.max(1, Math.ceil((progress.value / 100) * SECS)));

function pick(): Anchor {
  const others = pool.filter((a) => a.id !== anchor.value?.id);
  const src = others.length ? others : pool;
  return src[Math.floor(Math.random() * src.length)];
}

function startCountdown() {
  if (timer) window.clearInterval(timer);
  progress.value = 100;
  const step = 100 / (SECS * 10); // 每 100ms 递减
  timer = window.setInterval(() => {
    progress.value -= step;
    if (progress.value <= 0) {
      progress.value = 0;
      goNext(); // 倒计时结束自动切换下一位
    }
  }, 100);
}

function goNext() {
  anchor.value = pick();
  likedYou.value = Math.random() < 0.3;
  startCountdown();
}

function connect() {
  if (!anchor.value) return;
  if (timer) window.clearInterval(timer);
  startOutgoing(anchor.value);
  router.push(`/call/${anchor.value.id}`);
}

function report() {
  if (anchor.value) router.push(`/block-and-report?id=${anchor.value.id}`);
}

function exit() {
  router.back();
}

onMounted(async () => {
  pool = await api.getAnchors();
  if (!pool.length) return;
  // 进入即扣一次匹配费(雷达页选择档位即为同意)
  if (userStore.coins < cost) {
    emitter.emit("toast", t("matchDetail.insufficientCoins"));
    router.replace("/recharge");
    return;
  }
  userStore.addCoins(-cost);
  emitter.emit("toast", t("matchDetail.coinsDeducted", { cost }));
  anchor.value = pool[0];
  likedYou.value = Math.random() < 0.3;
  startCountdown();
});

onUnmounted(() => {
  if (timer) window.clearInterval(timer);
});
</script>

<style scoped lang="scss">
.match-deck {
  position: relative;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--eve-bg);
}

.bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  animation: bgIn 0.35s ease;
}
@keyframes bgIn {
  from {
    opacity: 0;
    transform: scale(1.04);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.5) 0%,
    transparent 20%,
    transparent 42%,
    rgba(8, 5, 14, 0.55) 66%,
    rgba(8, 5, 14, 0.96) 100%
  );
}

.bar {
  position: relative;
  z-index: 5;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(10px + env(safe-area-inset-top)) 14px 8px;
  .title {
    font-size: 17px;
    font-weight: 800;
    color: #fff;
    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.5);
  }
  .icon-btn {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: #fff;
    background: rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(6px);
  }
}

.spacer {
  flex: 1;
  min-height: 0;
}

.info {
  position: relative;
  z-index: 4;
  padding: 0 20px 14px;
  animation: infoIn 0.35s ease;

  .liked-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 12px;
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    color: #fff;
    background: var(--eve-grad);
    box-shadow: var(--eve-glow-pink);
  }
  .name-row {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--eve-green);
    box-shadow: 0 0 8px rgba(34, 197, 94, 0.9);
  }
  .name {
    font-size: 27px;
    font-weight: 800;
    color: #fff;
  }
  .age {
    padding: 3px 10px;
    border-radius: 11px;
    background: rgba(255, 255, 255, 0.2);
    font-size: 14px;
    color: #fff;
  }
  .flag {
    width: 24px;
    height: 16px;
    border-radius: 3px;
    object-fit: cover;
  }
  .bio {
    margin-top: 9px;
    font-size: 14px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.85);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}
@keyframes infoIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dock {
  position: relative;
  z-index: 5;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 24px calc(20px + env(safe-area-inset-bottom));
}

.countdown {
  width: 100%;
  height: 4px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.16);
  overflow: hidden;
  i {
    display: block;
    height: 100%;
    border-radius: 4px;
    background: var(--eve-grad);
    transition: width 0.1s linear;
  }
}

.auto-tip {
  margin: 8px 0 14px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
}

.connect {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 240px;
  height: 54px;
  padding: 0 36px;
  border-radius: 27px;
  color: #fff;
  font-size: 17px;
  font-weight: 800;
  background: var(--eve-grad);
  box-shadow: var(--eve-glow-pink);
}

.next {
  margin-top: 14px;
  font-size: 15px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.75);
}
</style>
