<template>
  <section v-if="anchor" class="detail">
    <!-- 头图轮播 -->
    <div class="swiper-box">
      <van-swipe :autoplay="3500" :show-indicators="false" @change="(i: number) => (swipeIndex = i)" ref="swipeRef">
        <van-swipe-item v-for="(img, i) in gallery" :key="i">
          <van-image fit="cover" class="slide" :src="img" @click="preview(img)" />
        </van-swipe-item>
      </van-swipe>

      <button class="circle back" @click="router.back()"><ChevronLeft :size="22" :stroke-width="2" /></button>
      <button class="circle more" @click="showActions = true"><MoreHorizontal :size="20" :stroke-width="2" /></button>

      <span v-if="anchor.live" class="live-badge"><i class="d" />LIVE</span>

      <div v-if="gallery.length > 1" class="thumbs">
        <img
          v-for="(img, i) in gallery"
          :key="i"
          :src="img"
          :class="{ active: swipeIndex === i }"
          @click="swipeRef?.swipeTo(i)"
        />
      </div>
    </div>

    <!-- 信息面板 -->
    <div class="panel">
      <div class="head-row">
        <div class="head-left">
          <div class="name-line">
            <h2>{{ anchor.nickname }}</h2>
            <span class="status" :class="statusClass">{{ statusText }}</span>
          </div>
          <button class="id-row" @click="copyId">
            ID: {{ anchor.id }}
            <Copy :size="13" :stroke-width="1.8" />
          </button>
          <span v-if="anchor.distance != null" class="dist-row">
            <MapPin :size="12" :stroke-width="1.8" />{{ anchor.distance.toFixed(1) }} km
          </span>
        </div>
        <div class="head-right">
          <div class="head-avatar-ring">
            <van-image round fit="cover" class="head-avatar" :src="anchor.avatar" @click="preview(anchor.avatar)" />
          </div>
          <button class="follow" :class="{ on: followed }" @click="toggleFollow">
            {{ followed ? t("common.following") : `+ ${t("common.follow")}` }}
          </button>
        </div>
      </div>

      <p class="bio">{{ anchor.intro }}</p>

      <div class="stats">
        <div class="stat">
          <span class="g">♀</span>
          <span>{{ t("anchor.female") }}</span>
        </div>
        <i class="div" />
        <div class="stat">
          <Cake :size="15" :stroke-width="1.8" class="ic" />
          <span>{{ anchor.age }}</span>
        </div>
        <i class="div" />
        <div class="stat">
          <img class="flag" :src="countryFlag(anchor.region)" alt="" />
          <span>{{ anchor.region.toUpperCase() }}</span>
        </div>
        <i class="div" />
        <div class="stat">
          <Users :size="15" :stroke-width="1.8" class="ic" />
          <span>{{ anchor.followers }}</span>
        </div>
      </div>

      <!-- Moment -->
      <div v-if="moments.length" class="section">
        <div class="section-head">
          <span class="section-title">{{ t("anchor.moment") }}</span>
          <button class="more-link" @click="router.push(`/user-dynamic-list/${anchor.id}`)">{{ t("anchor.more") }} ›</button>
        </div>
        <div class="moment-grid">
          <van-image
            v-for="m in moments.slice(0, 6)"
            :key="m.id"
            fit="cover"
            class="moment-thumb"
            :src="m.images[0]"
            @click="preview(m.images[0])"
          />
        </div>
      </div>

      <!-- Profile -->
      <div class="section">
        <span class="section-title">{{ t("anchor.profile") }}</span>
        <div class="profile-fields">
          <div v-if="anchor.height" class="field"><Ruler :size="14" :stroke-width="1.8" /><span>{{ t("anchor.height") }}</span><b>{{ anchor.height }}cm</b></div>
          <div v-if="anchor.weight" class="field"><Dumbbell :size="14" :stroke-width="1.8" /><span>{{ t("anchor.weight") }}</span><b>{{ anchor.weight }}kg</b></div>
          <div v-if="anchor.job" class="field"><Briefcase :size="14" :stroke-width="1.8" /><span>{{ t("anchor.job") }}</span><b>{{ anchor.job }}</b></div>
          <div v-if="anchor.relationship" class="field"><Heart :size="14" :stroke-width="1.8" /><span>{{ t("anchor.relationship") }}</span><b>{{ anchor.relationship }}</b></div>
        </div>
        <div class="chips">
          <span v-for="(tag, i) in anchor.tags" :key="tag" class="chip" :class="`c${i % 3}`">{{ tag }}</span>
        </div>
      </div>

      <!-- 私密相册(付费) -->
      <div v-if="anchor.album?.length" class="section">
        <span class="section-title">{{ t("anchor.privateAlbum") }}</span>
        <div class="album-grid">
          <button v-for="(img, i) in anchor.album" :key="i" class="album-item" @click="openAlbum(i, img)">
            <van-image fit="cover" class="album-img" :class="{ locked: !unlocked.has(i) }" :src="img" />
            <span v-if="!unlocked.has(i)" class="album-lock"><Lock :size="20" :stroke-width="2" /></span>
          </button>
        </div>
      </div>

      <!-- Gifts -->
      <div class="section">
        <span class="section-title">{{ t("anchor.gifts") }}</span>
        <div class="gift-strip">
          <div v-for="g in receivedGifts" :key="g.icon" class="gift">
            <span class="face">{{ g.icon }}</span>
            <span class="count">×{{ g.count }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="bottom-bar">
      <button class="cta" @click="startCall">
        <Video :size="22" :stroke-width="2" />
        <span class="cta-text">
          {{ t("anchor.videoCall") }}
          <small>
            <img src="/assets/eve/callDialog/coin_300@2x.png" alt="" />
            <s class="orig">{{ anchor.price }}</s>
            <b class="now">{{ vipPrice }}{{ t("anchor.perMin") }}</b>
            <span class="vip-tag">{{ t("anchor.vipBadge") }}</span>
          </small>
        </span>
      </button>
      <button class="msg-btn" @click="startChat">
        <MessageCircle :size="24" :stroke-width="1.9" />
      </button>
    </div>

    <!-- 付费图片解锁弹窗 -->
    <van-popup v-model:show="showUnlock" round position="center" teleport="body" :z-index="3600">
      <div class="unlock-card">
        <span class="u-ico"><Lock :size="26" :stroke-width="1.8" /></span>
        <p class="u-title">{{ t("anchor.paidPicture") }}</p>
        <button class="u-btn" @click="unlockAlbum">
          <img src="/assets/eve/callDialog/coin_300@2x.png" alt="" />{{ t("anchor.unlockFor", { n: ALBUM_PRICE }) }}
        </button>
        <button class="u-cancel" @click="showUnlock = false">{{ t("common.cancel") }}</button>
      </div>
    </van-popup>

    <van-action-sheet
      v-model:show="showActions"
      :actions="reportActions"
      :cancel-text="t('common.cancel')"
      close-on-click-action
      @select="onAction"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { showImagePreview } from "vant";
import {
  ChevronLeft,
  MoreHorizontal,
  Copy,
  Cake,
  Users,
  Video,
  MessageCircle,
  Ruler,
  Dumbbell,
  Briefcase,
  Heart,
  Lock,
  MapPin
} from "lucide-vue-next";
import emitter from "../common/eventBus";
import { api } from "../services/api";
import { fetchAnchorCard } from "../services/anchor";
import { followUser, unfollowUser, isFollowing } from "../services/relation";
import { ApiError } from "../services/http";
import { useCall } from "../composables/useCall";
import { useUserStore } from "../stores";
import { countryFlag } from "../utils/assets";
import type { Anchor, Moment } from "../types/eve";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { startOutgoing } = useCall();

const ALBUM_PRICE = 50;
const id = Number(route.params.id);
const anchor = ref<Anchor | null>(null);
const moments = ref<Moment[]>([]);
const followed = ref(false);
const followBusy = ref(false);
const showActions = ref(false);
const swipeIndex = ref(0);
const swipeRef = ref<{ swipeTo: (i: number) => void } | null>(null);
const unlocked = ref<Set<number>>(new Set());
const showUnlock = ref(false);
const pendingIdx = ref(-1);

const isVip = computed(() => userStore.isVip);
// VIP 视频通话 7 折价
const vipPrice = computed(() => (anchor.value ? Math.round(anchor.value.price * 0.7) : 0));
const effectivePrice = computed(() => (isVip.value ? vipPrice.value : anchor.value?.price || 0));

const receivedGifts = [
  { icon: "🌹", count: 120 },
  { icon: "💎", count: 18 },
  { icon: "👑", count: 6 },
  { icon: "🚀", count: 2 }
];

const gallery = computed(() => {
  if (!anchor.value) return [];
  return [anchor.value.avatar, ...moments.value.map((m) => m.images[0])].filter(Boolean);
});

const statusText = computed(() => {
  if (!anchor.value) return "";
  return anchor.value.online && anchor.value.onDuty
    ? t("anchor.online")
    : anchor.value.onDuty
      ? t("anchor.busy")
      : t("anchor.offline");
});
const statusClass = computed(() => {
  if (!anchor.value) return "";
  return anchor.value.online && anchor.value.onDuty ? "online" : anchor.value.onDuty ? "busy" : "offline";
});

function preview(img: string) {
  showImagePreview([img]);
}

function copyId() {
  navigator.clipboard?.writeText(String(id)).catch(() => {});
  emitter.emit("toast", t("anchor.copied"));
}

async function toggleFollow() {
  if (followBusy.value) return;
  followBusy.value = true;
  const was = followed.value;
  try {
    const status = was ? await unfollowUser(id) : await followUser(id);
    followed.value = isFollowing(status);
    emitter.emit("toast", followed.value ? t("anchor.followed") : t("anchor.unfollowed"));
    if (followed.value !== was) {
      userStore.setUser({ following: Math.max(0, (userStore.user.following ?? 0) + (followed.value ? 1 : -1)) });
    }
  } catch (e) {
    emitter.emit("toast", e instanceof ApiError ? e.message : t("followFans.actionFailed"));
  } finally {
    followBusy.value = false;
  }
}

function startCall() {
  if (!anchor.value) return;
  // 余额不足以支付 1 分钟 → 提示并去充值(简化版 VIP/充值拦截)
  if (userStore.coins < effectivePrice.value) {
    emitter.emit("toast", t("anchor.notEnoughCoins"));
    router.push("/recharge");
    return;
  }
  startOutgoing(anchor.value);
  router.push(`/call/${id}`);
}

function startChat() {
  router.push(`/chat/${id}`);
}

function openAlbum(i: number, img: string) {
  if (unlocked.value.has(i)) {
    preview(img);
    return;
  }
  pendingIdx.value = i;
  showUnlock.value = true;
}

function unlockAlbum() {
  if (userStore.coins < ALBUM_PRICE) {
    showUnlock.value = false;
    emitter.emit("toast", t("anchor.notEnoughCoins"));
    router.push("/recharge");
    return;
  }
  userStore.addCoins(-ALBUM_PRICE);
  unlocked.value = new Set([...unlocked.value, pendingIdx.value]);
  showUnlock.value = false;
}

const reportActions = computed(() => [
  { name: t("anchor.report"), value: "report" },
  { name: t("anchor.block"), value: "block" }
]);

function onAction(action: { value?: string }) {
  if (action.value === "report") {
    router.push(`/block-and-report?id=${id}`);
  } else {
    emitter.emit("toast", t("anchor.blocked"));
    router.back();
  }
}

onMounted(async () => {
  const [a, m] = await Promise.all([api.getAnchor(id), api.getUserMoments(id)]);
  anchor.value = a;
  moments.value = m;
  // 真实大卡覆盖身份 + 关注态(mock 主播无真实卡 → 保留 mock 展示)
  try {
    const { overlay, relationStatus } = await fetchAnchorCard(id, userStore.user.id);
    anchor.value = { ...a, ...overlay };
    followed.value = isFollowing(relationStatus);
  } catch {
    /* 真实卡不可用,退回 mock 展示 */
  }
});
</script>

<style scoped lang="scss">
.detail {
  min-height: 100vh;
  background: var(--eve-bg);
  padding-bottom: 84px;
}

.swiper-box {
  position: relative;
  .slide {
    width: 100%;
    height: 56vh;
    display: block;
  }
}

.circle {
  position: absolute;
  top: calc(14px + env(safe-area-inset-top));
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  z-index: 10;
  color: #fff;
}
.back {
  left: 14px;
}
.more {
  right: 14px;
}

.head-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
}

.follow {
  height: 30px;
  padding: 0 18px;
  border-radius: 15px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  color: #fff;
  background: var(--eve-grad);
  box-shadow: var(--eve-glow-pink);

  &.on {
    background: rgba(255, 255, 255, 0.1);
    box-shadow: none;
    border: 1px solid rgba(255, 255, 255, 0.35);
  }
}

.thumbs {
  position: absolute;
  left: 14px;
  bottom: 14px;
  z-index: 10;
  display: flex;
  gap: 8px;
  max-width: calc(100% - 28px);
  overflow-x: auto;
  &::-webkit-scrollbar {
    display: none;
  }
  img {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    object-fit: cover;
    flex: 0 0 auto;
    border: 2px solid transparent;
    &.active {
      border-color: var(--eve-pink);
    }
  }
}

.panel {
  position: relative;
  margin-top: -22px;
  padding: 20px 16px 8px;
  border-radius: 22px 22px 0 0;
  background: var(--eve-bg);
}

.head-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.head-left {
  flex: 1;
  min-width: 0;
}

.name-line {
  display: flex;
  align-items: center;
  gap: 10px;
  h2 {
    font-size: 21px;
    font-weight: 800;
    color: #fff;
  }
  .status {
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    &::before {
      content: "";
      width: 6px;
      height: 6px;
      border-radius: 50%;
      margin-right: 5px;
      background: currentColor;
      box-shadow: 0 0 6px currentColor;
    }
    &.online {
      color: var(--eve-green);
    }
    &.busy {
      color: var(--eve-gold);
    }
    &.offline {
      color: var(--eve-faint);
    }
  }
}

.id-row {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--eve-faint);
}

.head-avatar-ring {
  width: 66px;
  height: 66px;
  border-radius: 50%;
  padding: 2px;
  background: conic-gradient(from 210deg, #ff2a7a, #9945ff, #ffb800, #ff2a7a);
  flex: 0 0 auto;
}

.head-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--eve-bg);
}

.bio {
  margin: 14px 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--eve-muted);
}

.stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-top: 1px solid var(--eve-line);

  .stat {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    .ic {
      color: var(--eve-muted);
    }
    .g {
      font-size: 15px;
      line-height: 1;
      color: var(--eve-pink);
    }
    .flag {
      width: 20px;
      height: 14px;
      border-radius: 3px;
      object-fit: cover;
    }
    span {
      font-size: 13px;
      font-weight: 600;
      color: #fff;
    }
  }
  .div {
    width: 1px;
    height: 22px;
    background: var(--eve-line);
  }
}

.section {
  margin-top: 18px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.section-title {
  font-size: 15px;
  font-weight: 800;
  color: #fff;
}

.more-link {
  font-size: 12px;
  color: var(--eve-faint);
}

.moment-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  .moment-thumb {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 10px;
    overflow: hidden;
  }
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
  .chip {
    padding: 6px 13px;
    border-radius: 14px;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid transparent;
    &.c0 {
      background: rgba(255, 42, 122, 0.12);
      border-color: rgba(255, 42, 122, 0.28);
      color: #ff7aa8;
    }
    &.c1 {
      background: rgba(153, 69, 255, 0.14);
      border-color: rgba(153, 69, 255, 0.3);
      color: #c0a3ff;
    }
    &.c2 {
      background: rgba(255, 184, 0, 0.12);
      border-color: rgba(255, 184, 0, 0.28);
      color: #ffcf5c;
    }
  }
}

.gift-strip {
  display: flex;
  gap: 16px;
  margin-top: 10px;
  overflow-x: auto;
  &::-webkit-scrollbar {
    display: none;
  }
  .gift {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    flex: 0 0 auto;
    width: 56px;
    padding: 10px 0;
    border-radius: 14px;
    background: var(--eve-surface);
    border: 1px solid var(--eve-line);
    .face {
      font-size: 30px;
    }
    .count {
      font-size: 12px;
      font-weight: 700;
      color: var(--eve-gold);
    }
  }
}

.bottom-bar {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  width: min(400PX, 100vw);
  bottom: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px calc(10px + env(safe-area-inset-bottom));
  background: rgba(11, 7, 18, 0.92);
  backdrop-filter: blur(14px);
  border-top: 1px solid var(--eve-line);
}

.cta {
  flex: 1;
  height: 52px;
  border-radius: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  background: var(--eve-grad);
  box-shadow: var(--eve-glow-pink);
  .cta-text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    color: #fff;
    font-size: 15px;
    font-weight: 800;
    line-height: 1.1;
    small {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.85);
      img {
        width: 12px;
        height: 12px;
      }
      .orig {
        text-decoration: line-through;
        opacity: 0.6;
      }
      .now {
        font-weight: 800;
        color: #fff;
      }
      .vip-tag {
        margin-left: 2px;
        padding: 0 6px;
        border-radius: 6px;
        font-size: 9px;
        font-weight: 800;
        color: #1a1020;
        background: linear-gradient(135deg, #ffd36e, #ffb800);
      }
    }
  }
}

/* Live 徽标 */
.live-badge {
  position: absolute;
  top: calc(14px + env(safe-area-inset-top));
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  color: #fff;
  background: var(--eve-grad);
  box-shadow: var(--eve-glow-pink);
  .d {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #fff;
    animation: blink 1.2s ease-in-out infinite;
  }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

.dist-row {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--eve-faint);
}

/* Profile 结构化字段 */
.profile-fields {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin: 10px 0 12px;
  .field {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 12px;
    border-radius: 12px;
    background: var(--eve-surface);
    border: 1px solid var(--eve-line);
    font-size: 12px;
    color: var(--eve-muted);
    svg {
      color: var(--eve-pink);
      flex: 0 0 auto;
    }
    span {
      flex: 1;
    }
    b {
      color: #fff;
      font-weight: 700;
    }
  }
}

/* 私密相册 */
.album-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-top: 10px;
}
.album-item {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 10px;
  overflow: hidden;
  .album-img {
    width: 100%;
    height: 100%;
    &.locked {
      filter: blur(8px) brightness(0.7);
    }
  }
  .album-lock {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: #fff;
  }
}

/* 解锁弹窗 */
.unlock-card {
  width: 270px;
  padding: 26px 22px 20px;
  background: linear-gradient(180deg, #1d142b, #0b0712);
  border: 1px solid var(--eve-line);
  border-radius: 22px;
  text-align: center;
  .u-ico {
    display: grid;
    place-items: center;
    width: 56px;
    height: 56px;
    margin: 0 auto 12px;
    border-radius: 50%;
    color: var(--eve-gold);
    background: rgba(255, 184, 0, 0.12);
    border: 1px solid rgba(255, 184, 0, 0.3);
  }
  .u-title {
    font-size: 16px;
    font-weight: 700;
    color: #fff;
  }
  .u-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    height: 46px;
    margin-top: 18px;
    border-radius: 23px;
    color: #fff;
    font-size: 15px;
    font-weight: 800;
    background: var(--eve-grad);
    box-shadow: var(--eve-glow-pink);
    img {
      width: 16px;
      height: 16px;
    }
  }
  .u-cancel {
    margin-top: 12px;
    font-size: 14px;
    color: var(--eve-muted);
  }
}

.msg-btn {
  width: 52px;
  height: 52px;
  border-radius: 18px;
  background: var(--eve-surface);
  border: 1px solid var(--eve-line);
  color: var(--eve-text);
  display: grid;
  place-items: center;
}
</style>
