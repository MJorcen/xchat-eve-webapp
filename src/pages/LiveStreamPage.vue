<template>
  <section v-if="room" class="live-room" @touchstart.passive="onTouchStart" @touchend="onTouchEnd">
    <img class="stage" :src="room.cover" alt="" />
    <div class="scrim-top" />
    <div class="scrim-bottom" />

    <!-- 顶部主播条 -->
    <header class="top-bar">
      <div class="anchor-pill">
        <div class="avatar-wrap">
          <van-image round fit="cover" class="avatar" :src="room.anchor.avatar" lazy-load />
          <CountryFlag class="flag" :region="room.anchor.region" :size="15" />
        </div>
        <div class="meta">
          <strong>{{ room.anchor.nickname }}</strong>
          <span class="viewers"><i class="dot" />{{ t("live.watching", { count: formatViewers(viewers) }) }}</span>
        </div>
      </div>
      <button class="follow" :class="{ on: followed }" @click="followed = !followed">
        {{ followed ? t("common.following") : t("common.follow") }}
      </button>
      <button class="exit" @click="router.back()">✕</button>
    </header>

    <!-- 礼物横幅 -->
    <Transition name="slide-fade">
      <div v-if="banner" class="gift-banner">
        <van-image round fit="cover" class="b-avatar" :src="banner.avatar" />
        <span>{{ t("live.sentLabel", { name: banner.name }) }}</span>
        <b>{{ banner.gift }}</b>
        <span class="face">{{ banner.icon }}</span>
      </div>
    </Transition>

    <!-- 飘心 -->
    <div class="hearts">
      <span v-for="h in hearts" :key="h.id" class="heart" :style="{ '--dx': h.dx + 'px', color: h.color }">❤</span>
    </div>

    <!-- 评论流 -->
    <div ref="commentBox" class="comments">
      <div v-for="(c, i) in comments" :key="i" class="bubble" :class="c.kind">
        <template v-if="c.kind === 'enter'">{{ t("live.joined", { name: c.name }) }}</template>
        <template v-else-if="c.kind === 'gift'"><b>{{ c.name }}</b> {{ t("live.sentGift", { gift: c.text }) }} 🎁</template>
        <template v-else><b>{{ c.name }}:</b> {{ c.text }}</template>
      </div>
    </div>

    <!-- 快捷礼物条 -->
    <div class="quick-gifts">
      <button v-for="g in quickGifts" :key="g.id" class="qg" @click="quickSend(g)">
        <span class="qg-ico">{{ g.icon }}</span>
        <span class="qg-val">{{ g.price }}</span>
      </button>
    </div>

    <!-- 底部操作 -->
    <footer class="bottom-bar">
      <input v-model="draft" class="say" :placeholder="t('live.sayPlaceholder')" @keyup.enter="sendComment" />
      <button class="round heart-btn" @click="spawnHeart(true)">❤</button>
      <button class="round gift-btn" @click="showGift = true">
        <img src="/assets/eve/chatRoom/ic_gift@2x.png" alt="" />
      </button>
      <button class="round call-btn" @click="callAnchor">📞</button>
    </footer>

    <GiftPanel v-model:show="showGift" :anchor="room.anchor" @sent="onGiftSent" />
  </section>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import emitter from "../common/eventBus";
import { api } from "../services/api";
import { getLiveRooms, enterLiveRoom, leaveLiveRoom } from "../services/room";
import { useCall } from "../composables/useCall";
import { useUserStore } from "../stores";
import CountryFlag from "../components/CountryFlag.vue";
import GiftPanel from "../components/GiftPanel.vue";
import type { Anchor, Gift, LiveRoom } from "../types/eve";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { startOutgoing } = useCall();
const userStore = useUserStore();

const rooms = ref<LiveRoom[]>([]);
const idx = ref(0);
const quickGifts = ref<Gift[]>([]);
const room = ref<LiveRoom | null>(null);
const viewers = ref(0);
const followed = ref(false);
const showGift = ref(false);
const draft = ref("");
let touchStartY = 0;
const comments = ref<{ name: string; text: string; avatar?: string; kind: "text" | "enter" | "gift" | "self" | "system" }[]>([]);
const hearts = ref<{ id: number; dx: number; color: string }[]>([]);
const banner = ref<{ name: string; avatar: string; gift: string; icon: string } | null>(null);
const commentBox = ref<HTMLElement | null>(null);

let senders: Anchor[] = [];
let gifts: Gift[] = [];
let heartId = 0;
let bannerTimer: number | null = null;
const timers: number[] = [];
const heartTimeouts: number[] = [];

const phrases = ["You look amazing 😍", "Hi from Brazil 🇧🇷", "sing one more!", "first time here", "love this vibe", "so pretty 💕", "hello everyone"];
const heartColors = ["#ff5473", "var(--eve-pink)", "var(--eve-gold)"];

function formatViewers(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}
function rand<T>(a: T[]): T {
  return a[Math.floor(Math.random() * a.length)];
}
function pushComment(c: (typeof comments.value)[number]) {
  comments.value.push(c);
  if (comments.value.length > 12) comments.value.shift();
  nextTick(() => {
    if (commentBox.value) commentBox.value.scrollTop = commentBox.value.scrollHeight;
  });
}
function spawnHeart(self = false) {
  void self;
  const id = heartId++;
  hearts.value.push({ id, dx: Math.round((Math.random() - 0.5) * 48), color: rand(heartColors) });
  const t = window.setTimeout(() => {
    hearts.value = hearts.value.filter((h) => h.id !== id);
    const idx = heartTimeouts.indexOf(t);
    if (idx !== -1) heartTimeouts.splice(idx, 1);
  }, 1600);
  heartTimeouts.push(t);
}
function sendComment() {
  const t = draft.value.trim();
  if (!t) return;
  pushComment({ name: "You", text: t, kind: "self" });
  draft.value = "";
}
function onGiftSent({ gift, count }: { gift: Gift; count: number }) {
  pushComment({ name: "You", text: `${gift.name} ×${count}`, kind: "gift" });
}
function callAnchor() {
  if (room.value) startOutgoing(room.value.anchor);
}

function seedRoom() {
  if (!room.value) return;
  comments.value = [];
  banner.value = null;
  viewers.value = room.value.viewers || 0;
  pushComment({ name: "System", text: `Welcome to ${room.value.anchor.nickname}'s room 💕`, kind: "system" });
  pushComment({ name: rand(senders).nickname, text: "", kind: "enter" });
  pushComment({ name: rand(senders).nickname, text: rand(phrases), kind: "text" });
}

// 上下滑切换主播房间(真实登记在线人数:离开旧房间 + 进入新房间)
function switchRoom(dir: number) {
  if (rooms.value.length < 2) return;
  const prevId = room.value?.id;
  idx.value = (idx.value + dir + rooms.value.length) % rooms.value.length;
  room.value = rooms.value[idx.value];
  followed.value = false;
  seedRoom();
  if (prevId != null) void leaveLiveRoom(prevId).catch(() => undefined);
  if (room.value) void enterLiveRoom(room.value.id).catch(() => undefined);
}
function onTouchStart(e: TouchEvent) {
  touchStartY = e.touches[0].clientY;
}
function onTouchEnd(e: TouchEvent) {
  if ((e.target as HTMLElement).closest(".bottom-bar, .quick-gifts, .top-bar, .comments")) return;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dy) > 70) switchRoom(dy < 0 ? 1 : -1);
}

// 快捷送礼(一键)
function quickSend(g: Gift) {
  if (userStore.coins < g.price) {
    emitter.emit("toast", t("gift.notEnoughCoins"));
    router.push("/recharge");
    return;
  }
  userStore.addCoins(-g.price);
  pushComment({ name: "You", text: `${g.name} ×1`, kind: "gift" });
  banner.value = { name: "You", avatar: userStore.user.avatar || "", gift: g.name, icon: g.icon };
  if (bannerTimer) window.clearTimeout(bannerTimer);
  bannerTimer = window.setTimeout(() => (banner.value = null), 3500);
  spawnHeart(true);
}

onMounted(async () => {
  const id = Number(route.params.id);
  const [list, g, anchors] = await Promise.all([getLiveRooms(), api.getGifts(), api.getAnchors()]);
  rooms.value = list;
  gifts = g;
  quickGifts.value = g.slice(0, 5);
  senders = anchors;
  idx.value = Math.max(0, list.findIndex((r) => r.id === id));
  room.value = list[idx.value] || list[0];
  seedRoom();
  if (room.value) void enterLiveRoom(room.value.id).catch(() => undefined);

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  timers.push(window.setInterval(() => pushComment({ name: rand(senders).nickname, text: rand(phrases), kind: "text" }), 2200));
  timers.push(window.setInterval(() => {
    const sender = rand(senders);
    const gift = rand(gifts);
    banner.value = { name: sender.nickname, avatar: sender.avatar, gift: gift.name, icon: gift.icon };
    if (bannerTimer) window.clearTimeout(bannerTimer);
    bannerTimer = window.setTimeout(() => (banner.value = null), 3500);
    emitter.emit("gift:received", { fromId: sender.id, giftId: gift.id, count: 1 });
    pushComment({ name: sender.nickname, text: gift.name, kind: "gift" });
  }, 7000));
  if (!reduce) timers.push(window.setInterval(() => spawnHeart(), 2500));
});

onUnmounted(() => {
  timers.forEach((t) => window.clearInterval(t));
  heartTimeouts.forEach((t) => window.clearTimeout(t));
  if (bannerTimer) window.clearTimeout(bannerTimer);
  if (room.value) void leaveLiveRoom(room.value.id).catch(() => undefined);
});
</script>

<style scoped lang="scss">
.live-room {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: min(400PX, 100vw);
  overflow: hidden;
  background: #000;
}
.stage {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.scrim-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 22%;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.55), transparent);
}
.scrim-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 38%;
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.7), transparent);
}
.top-bar {
  position: absolute;
  top: calc(env(safe-area-inset-top) + 8px);
  left: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 30;
}
.anchor-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px 4px 4px;
  background: rgba(0, 0, 0, 0.32);
  border-radius: 999px;
  .avatar-wrap {
    position: relative;
  }
  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    overflow: hidden;
  }
  .flag {
    position: absolute;
    right: -2px;
    bottom: -2px;
    line-height: 1;
  }
  .meta {
    strong {
      display: block;
      font-size: 14px;
      color: #fff;
    }
    .viewers {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.85);
      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #ff3b30;
      }
    }
  }
}
.follow {
  height: 28px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: var(--eve-grad);
  &.on {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.5);
  }
}
.exit {
  margin-left: auto;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  font-size: 16px;
}
.gift-banner {
  position: absolute;
  left: 12px;
  bottom: 200px;
  z-index: 25;
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 78%;
  padding: 6px 14px 6px 6px;
  border-radius: 8px 999px 999px 8px;
  background: linear-gradient(90deg, rgba(255, 84, 115, 0.85), rgba(235, 99, 0, 0.55));
  color: #fff;
  font-size: 12px;
  .b-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    overflow: hidden;
  }
  b {
    color: var(--eve-gold);
  }
  .face {
    font-size: 24px;
  }
}
.hearts {
  position: absolute;
  right: 18px;
  bottom: 96px;
  width: 60px;
  height: 240px;
  pointer-events: none;
  z-index: 25;
}
.heart {
  position: absolute;
  bottom: 0;
  left: 18px;
  font-size: 22px;
  animation: float-up 1.6s ease-out forwards;
}
@keyframes float-up {
  0% {
    transform: translateY(0) scale(0.6);
    opacity: 0;
  }
  15% {
    opacity: 1;
  }
  100% {
    transform: translate(var(--dx), -180px) scale(1.1);
    opacity: 0;
  }
}
.comments {
  position: absolute;
  left: 12px;
  bottom: 84px;
  width: 72%;
  max-height: 38vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 20;
  mask-image: linear-gradient(180deg, transparent 0, #000 18%);
  &::-webkit-scrollbar {
    display: none;
  }
}
.bubble {
  width: max-content;
  max-width: 100%;
  padding: 6px 12px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.32);
  color: #fff;
  font-size: 13px;
  line-height: 1.3;
  word-break: break-word;
  b {
    color: var(--eve-pink);
  }
  &.gift b {
    color: var(--eve-gold);
  }
  &.enter,
  &.system {
    color: var(--eve-green);
  }
  &.gift {
    color: var(--eve-gold);
  }
  &.self b {
    color: var(--eve-pink);
  }
}
.quick-gifts {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: calc(58px + env(safe-area-inset-bottom));
  display: flex;
  gap: 8px;
  overflow-x: auto;
  z-index: 28;
  &::-webkit-scrollbar {
    display: none;
  }
}
.qg {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  width: 46px;
  padding: 5px 0;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.42);
  border: 1px solid var(--eve-line);
  backdrop-filter: blur(4px);
  .qg-ico {
    font-size: 22px;
    line-height: 1;
  }
  .qg-val {
    font-size: 10px;
    font-weight: 700;
    color: var(--eve-gold);
  }
}

.bottom-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px calc(8px + env(safe-area-inset-bottom));
  z-index: 30;
}
.say {
  flex: 1;
  height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 14px;
  &::placeholder {
    color: var(--eve-faint);
  }
}
.round {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  font-size: 18px;
  color: #fff;
  background: rgba(0, 0, 0, 0.35);
  img {
    width: 24px;
    height: 24px;
  }
}
.gift-btn {
  background: var(--eve-grad);
}
.call-btn {
  background: var(--eve-pink);
}
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
