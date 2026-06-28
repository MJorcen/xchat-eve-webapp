<template>
  <section class="deck-page">
    <!-- 顶部:返回 + 标题 + 举报 -->
    <header class="bar">
      <button class="icon-btn" @click="exit"><ChevronLeft :size="22" :stroke-width="2.2" /></button>
      <span class="title">{{ t("matchDetail.title") }}</span>
      <button class="icon-btn" @click="report"><Flag :size="19" :stroke-width="2" /></button>
    </header>

    <!-- 卡片牌堆 -->
    <div class="deck">
      <!-- 后面预览卡 -->
      <article v-if="next" class="card peek" :style="peekStyle">
        <van-image fit="cover" class="portrait" :src="next.avatar" lazy-load />
        <div class="scrim" />
      </article>

      <!-- 顶部可拖拽卡 -->
      <article
        v-if="current"
        class="card top"
        :style="topStyle"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onUp"
      >
        <van-image fit="cover" class="portrait" :src="current.avatar" lazy-load />
        <div class="scrim" />

        <span class="stamp like" :style="{ opacity: likeOpacity }">LIKE</span>
        <span class="stamp nope" :style="{ opacity: nopeOpacity }">NOPE</span>

        <span v-if="likedYou" class="liked-badge"><Heart :size="12" fill="currentColor" :stroke-width="0" /> {{ t("matchDetail.likedYou") }}</span>

        <div class="meta">
          <div class="meta-top">
            <span v-if="current.online" class="dot" />
            <strong class="name">{{ current.nickname }}</strong>
            <span class="age">{{ current.age }}</span>
            <img class="flag" :src="countryFlag(current.region)" alt="" />
          </div>
          <p class="bio">{{ current.intro }}</p>
        </div>
      </article>
    </div>

    <!-- 操作按钮 -->
    <div class="controls">
      <button class="ctrl pass" @click="swipe('left')"><X :size="26" :stroke-width="2.4" /></button>
      <button class="ctrl call" @click="callCurrent"><Video :size="22" :stroke-width="2.2" /></button>
      <button class="ctrl like" @click="swipe('right')"><Heart :size="30" fill="currentColor" :stroke-width="0" /></button>
    </div>

    <!-- 匹配成功遮罩 -->
    <div v-if="matchedAnchor" class="match-overlay" @click.self="keepSwiping">
      <p class="m-title">{{ t("matchDetail.itsAMatch") }}</p>
      <div class="m-avatars">
        <div class="m-ring"><van-image round fit="cover" class="m-av" :src="me.avatar" lazy-load /></div>
        <span class="m-heart">❤️</span>
        <div class="m-ring"><van-image round fit="cover" class="m-av" :src="matchedAnchor.avatar" lazy-load /></div>
      </div>
      <p class="m-sub">{{ t("matchDetail.matchSub", { name: matchedAnchor.nickname }) }}</p>
      <button class="m-call" @click="callMatched">{{ t("matchDetail.startVideoCall") }}</button>
      <button class="m-keep" @click="keepSwiping">{{ t("matchDetail.keepSwiping") }}</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { ChevronLeft, Flag, X, Heart, Video } from "lucide-vue-next";
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

const me = computed(() => userStore.user);
const cost = route.query.type === "Goddess" ? 500 : 300;

let pool: Anchor[] = [];
const current = ref<Anchor | null>(null);
const next = ref<Anchor | null>(null);
const likedYou = ref(false);
const matchedAnchor = ref<Anchor | null>(null);

// 拖拽状态
const THRESH = 90;
const dragging = ref(false);
const dx = ref(0);
const dy = ref(0);
const flying = ref<null | "left" | "right">(null);
let startX = 0;
let startY = 0;

const likeOpacity = computed(() => Math.max(0, Math.min(1, dx.value / 90)));
const nopeOpacity = computed(() => Math.max(0, Math.min(1, -dx.value / 90)));

const topStyle = computed(() => {
  if (flying.value) {
    const x = flying.value === "right" ? 640 : -640;
    const rot = flying.value === "right" ? 20 : -20;
    return { transform: `translate(${x}px, -30px) rotate(${rot}deg)`, transition: "transform .35s ease, opacity .35s ease", opacity: 0 };
  }
  if (dragging.value) {
    return { transform: `translate(${dx.value}px, ${dy.value}px) rotate(${dx.value * 0.04}deg)`, transition: "none" };
  }
  if (dx.value) {
    return { transform: "translate(0,0) rotate(0)", transition: "transform .25s ease" };
  }
  return {};
});

const peekStyle = computed(() => {
  if (flying.value) return { transform: "scale(1) translateY(0)", opacity: "1", transition: "transform .35s ease, opacity .35s ease" };
  return {};
});

function pick(): Anchor {
  const exclude = new Set([current.value?.id, next.value?.id]);
  const others = pool.filter((a) => !exclude.has(a.id));
  const src = others.length ? others : pool;
  return src[Math.floor(Math.random() * src.length)];
}

function advance() {
  current.value = next.value;
  next.value = pick();
  likedYou.value = Math.random() < 0.3;
}

function swipe(dir: "left" | "right") {
  if (flying.value || matchedAnchor.value || !current.value) return;
  const willMatch = dir === "right" && (likedYou.value || Math.random() < 0.35);
  const matchTarget = current.value;
  flying.value = dir;
  window.setTimeout(() => {
    flying.value = null;
    dx.value = 0;
    dy.value = 0;
    if (willMatch) {
      matchedAnchor.value = matchTarget;
      // 把已飞走的卡补上,遮罩关闭后直接是新卡
      advance();
    } else {
      advance();
    }
  }, 350);
}

function onDown(e: PointerEvent) {
  if (flying.value || matchedAnchor.value) return;
  dragging.value = true;
  startX = e.clientX;
  startY = e.clientY;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
}
function onMove(e: PointerEvent) {
  if (!dragging.value) return;
  dx.value = e.clientX - startX;
  dy.value = e.clientY - startY;
}
function onUp() {
  if (!dragging.value) return;
  dragging.value = false;
  if (dx.value > THRESH) swipe("right");
  else if (dx.value < -THRESH) swipe("left");
  else {
    dx.value = 0;
    dy.value = 0;
  }
}

function keepSwiping() {
  matchedAnchor.value = null;
}

function callMatched() {
  const a = matchedAnchor.value;
  if (!a) return;
  startOutgoing(a);
  router.push(`/call/${a.id}`);
}

function callCurrent() {
  if (!current.value) return;
  startOutgoing(current.value);
  router.push(`/call/${current.value.id}`);
}

function report() {
  if (current.value) router.push(`/block-and-report?id=${current.value.id}`);
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
  current.value = pool[0];
  next.value = pool[1] || pool[0];
  likedYou.value = Math.random() < 0.3;
});
</script>

<style scoped lang="scss">
.deck-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(110% 50% at 50% 0%, rgba(153, 69, 255, 0.16) 0%, transparent 55%),
    var(--eve-bg);
  padding-bottom: env(safe-area-inset-bottom);
  overflow: hidden;
}

.bar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(10px + env(safe-area-inset-top)) 14px 8px;
  .title {
    font-size: 17px;
    font-weight: 800;
    color: #fff;
  }
  .icon-btn {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: var(--eve-muted);
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid var(--eve-line);
  }
}

.deck {
  flex: 1;
  position: relative;
  margin: 6px 16px 0;
  min-height: 0;
}

.card {
  position: absolute;
  inset: 0;
  border-radius: 24px;
  overflow: hidden;
  background: var(--eve-surface);
  border: 1px solid var(--eve-line);
  .portrait {
    width: 100%;
    height: 100%;
  }
  .scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(transparent 48%, rgba(0, 0, 0, 0.82));
  }
}

.peek {
  transform: scale(0.94) translateY(14px);
  opacity: 0.7;
  z-index: 1;
}

.top {
  z-index: 2;
  touch-action: none;
  cursor: grab;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  &:active {
    cursor: grabbing;
  }
}

.stamp {
  position: absolute;
  top: 26px;
  padding: 5px 14px;
  font-size: 26px;
  font-weight: 900;
  letter-spacing: 1px;
  border-radius: 10px;
  border: 3px solid currentColor;
  pointer-events: none;
}
.stamp.like {
  left: 20px;
  color: #22e58a;
  transform: rotate(-16deg);
}
.stamp.nope {
  right: 20px;
  color: #ff3b5c;
  transform: rotate(16deg);
}

.liked-badge {
  position: absolute;
  top: 16px;
  left: 16px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: var(--eve-grad);
  box-shadow: var(--eve-glow-pink);
}

.meta {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 18px;
  text-align: left;
  .meta-top {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--eve-green);
    box-shadow: 0 0 8px rgba(34, 197, 94, 0.9);
  }
  .name {
    font-size: 24px;
    font-weight: 800;
    color: #fff;
  }
  .age {
    padding: 2px 9px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.18);
    font-size: 13px;
    color: #fff;
  }
  .flag {
    width: 22px;
    height: 15px;
    border-radius: 3px;
    object-fit: cover;
  }
  .bio {
    margin-top: 7px;
    font-size: 13px;
    line-height: 1.45;
    color: rgba(255, 255, 255, 0.82);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

.controls {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 22px;
  padding: 18px 0 22px;

  .ctrl {
    display: grid;
    place-items: center;
    border-radius: 50%;
    border: 1px solid var(--eve-line);
    background: var(--eve-surface);
  }
  .pass {
    width: 56px;
    height: 56px;
    color: #ff5c7a;
  }
  .call {
    width: 50px;
    height: 50px;
    color: #b98bff;
  }
  .like {
    width: 66px;
    height: 66px;
    color: #fff;
    border-color: transparent;
    background: var(--eve-grad);
    box-shadow: var(--eve-glow-pink);
  }
}

.match-overlay {
  position: fixed;
  inset: 0;
  left: 50%;
  transform: translateX(-50%);
  width: min(400PX, 100vw);
  z-index: 3500;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 0 28px;
  background: rgba(8, 5, 14, 0.86);
  backdrop-filter: blur(10px);
  animation: overlayIn 0.25s ease;

  .m-title {
    font-size: 32px;
    font-weight: 900;
    background: var(--eve-grad);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .m-avatars {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .m-ring {
    width: 92px;
    height: 92px;
    border-radius: 50%;
    padding: 3px;
    background: conic-gradient(from 210deg, #ff2a7a, #9945ff, #ffb800, #ff2a7a);
  }
  .m-av {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    overflow: hidden;
    border: 3px solid var(--eve-bg);
  }
  .m-heart {
    font-size: 30px;
    margin: 0 -6px;
    z-index: 1;
  }
  .m-sub {
    font-size: 14px;
    color: var(--eve-muted);
    text-align: center;
  }
  .m-call {
    margin-top: 6px;
    width: 100%;
    max-width: 300px;
    height: 52px;
    border-radius: 26px;
    color: #fff;
    font-size: 16px;
    font-weight: 800;
    background: var(--eve-grad);
    box-shadow: var(--eve-glow-pink);
  }
  .m-keep {
    font-size: 14px;
    color: var(--eve-muted);
  }
}

@keyframes overlayIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
