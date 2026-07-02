<template>
  <section v-if="anchor" class="detail">
    <!-- 封面(可滑动相册,左下缩略图指示条) -->
    <div class="cover">
      <van-swipe class="cover-swipe" :autoplay="0" :show-indicators="false" @change="(i: number) => (swipeIndex = i)" ref="swipeRef">
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

      <!-- 悬浮头像圆:跨在封面/信息卡交界处,右上 -->
      <button class="float-avatar" @click="preview(anchor.avatar)">
        <van-image round fit="cover" :src="anchor.avatar" />
      </button>
    </div>

    <!-- 信息卡(悬浮圆角卡,高度随内容自适应,不再靠死记的像素对齐) -->
    <div class="info-card">
      <div class="name-line">
        <h2 class="info-name">{{ anchor.nickname }}</h2>
        <span class="status-dot" :class="statusClass">{{ statusText }}</span>
      </div>
      <button class="id-row" @click="copyId"><i class="id-badge">ID</i>{{ anchor.id }}<Copy :size="12" :stroke-width="1.8" /></button>
      <div class="card-actions">
        <button class="follow" :class="{ on: followed }" @click="toggleFollow">
          {{ followed ? t("common.following") : `${t("common.follow")}+` }}
        </button>
      </div>
      <p v-if="anchor.intro" class="info-intro">{{ anchor.intro }}</p>
    </div>

    <!-- 主体 -->
    <div class="body">
      <!-- 四项资料(独立卡片) -->
      <div class="stats card-surface">
        <div class="stat">
          <span class="label">{{ t("anchor.gender") }}</span>
          <span class="val">{{ t("anchor.female") }}<i class="g">♀</i></span>
        </div>
        <i class="col-div" />
        <div class="stat">
          <span class="label">{{ t("anchor.age") }}</span>
          <span class="val">{{ anchor.age }}</span>
        </div>
        <i class="col-div" />
        <div class="stat">
          <span class="label">{{ t("anchor.location") }}</span>
          <span class="val">{{ anchor.region.toUpperCase() }}<CountryFlag :region="anchor.region" :size="13" /></span>
        </div>
        <i class="col-div" />
        <div class="stat">
          <span class="label">{{ t("anchor.followers") }}</span>
          <span class="val">{{ anchor.followers }}</span>
        </div>
      </div>

      <!-- 勋章(占位数据) -->
      <div class="section">
        <div class="section-head">
          <span class="sec-ic m-ic"><Award :size="15" :stroke-width="2" /></span>
          <span class="section-title">{{ t("anchor.medal") }}</span>
        </div>
        <div class="medal-card">
          <div class="medal-info">
            <span class="ml-row">{{ t("anchor.currentLevel") }} <b>{{ medalLevel }}</b></span>
            <span class="ml-name">{{ t("anchor.charmMedal") }}</span>
          </div>
          <div class="medal-art"><Heart :size="26" :stroke-width="1.5" fill="currentColor" /></div>
        </div>
      </div>

      <!-- Profile(身高/体重/感情) -->
      <div v-if="profilePills.length" class="section">
        <span class="section-title">{{ t("anchor.profile") }}</span>
        <div class="pill-row">
          <span v-for="p in profilePills" :key="p.key" class="pill" :class="p.key">
            <component :is="p.icon" :size="14" :stroke-width="2" />{{ p.text }}
          </span>
        </div>
      </div>

      <!-- 付费相册(点击解锁,真实从钱包扣金币) -->
      <div v-if="photoMoments.length" class="section">
        <div class="section-head">
          <span class="sec-ic p-ic"><Lock :size="13" :stroke-width="2.2" /></span>
          <span class="section-title">{{ t("anchor.paidAlbum") }}</span>
        </div>
        <div class="moment-grid">
          <button
            v-for="(m, i) in photoMoments.slice(0, 6)"
            :key="m.id"
            class="paid-photo"
            @click="onPaidPhotoClick(m.images[0], i)"
          >
            <van-image fit="cover" class="moment-thumb" :src="m.images[0]" />
            <div v-if="!unlockedPaid.has(i)" class="paid-mask">
              <Lock :size="18" :stroke-width="2" />
              <span class="paid-price"><img src="/assets/eve/callDialog/coin_300@2x.png" alt="" />{{ paidPhotoPrice }}</span>
            </div>
          </button>
        </div>
      </div>

      <!-- 相册(真实公开照片) -->
      <div v-if="anchor.album?.length" class="section">
        <span class="section-title">{{ t("anchor.privateAlbum") }}</span>
        <div class="album-grid">
          <button v-for="(img, i) in anchor.album" :key="i" class="album-item" @click="preview(img)">
            <van-image fit="cover" class="album-img" :src="img" />
          </button>
        </div>
      </div>

      <!-- Gifts(真实已收礼物墙,网格) -->
      <div v-if="receivedGifts.length" class="section">
        <div class="section-head">
          <span class="sec-ic g-ic"><GiftIcon :size="15" :stroke-width="2" /></span>
          <span class="section-title">{{ t("anchor.gifts") }}</span>
        </div>
        <div class="gift-grid">
          <div v-for="g in receivedGifts" :key="g.id" class="gift-cell">
            <div class="gift-box"><van-image fit="contain" class="gift-img" :src="g.icon" /></div>
            <span class="count">x{{ g.count }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部:VIP 气泡 + 通话/私信 -->
    <div class="bottom-wrap">
      <div class="vip-bubble">
        <span class="v-mark">V</span>{{ t("anchor.vipOnly") }}
        <img src="/assets/eve/callDialog/coin_300@2x.png" alt="" /><b>{{ vipPrice }}{{ t("anchor.perMin") }}</b>
      </div>
      <div class="bottom-bar">
        <button class="cta" @click="startCall">
          <Video :size="22" :stroke-width="2" />
          <span class="cta-text">
            {{ t("anchor.videoCall") }}
            <small><img src="/assets/eve/callDialog/coin_300@2x.png" alt="" />{{ anchor.price }}{{ t("anchor.perMin") }}</small>
          </span>
        </button>
        <button class="msg-btn" @click="startChat">
          <MessageCircle :size="24" :stroke-width="1.9" />
        </button>
      </div>
    </div>

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
import { showConfirmDialog, showImagePreview } from "vant";
import {
  ChevronLeft,
  MoreHorizontal,
  Copy,
  Video,
  MessageCircle,
  Ruler,
  Dumbbell,
  Heart,
  Award,
  Lock,
  Gift as GiftIcon
} from "lucide-vue-next";
import emitter from "../common/eventBus";
import { api } from "../services/api";
import { fetchAnchorCard } from "../services/anchor";
import { getUserMomentsPage } from "../services/moment";
import { getReceivedGifts, type ReceivedGift } from "../services/gift";
import { followUser, unfollowUser, isFollowing } from "../services/relation";
import { ApiError } from "../services/http";
import { useCall } from "../composables/useCall";
import { useUserStore } from "../stores";
import CountryFlag from "../components/CountryFlag.vue";
import type { Anchor, Moment } from "../types/eve";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { startOutgoing } = useCall();

const id = Number(route.params.id);
const anchor = ref<Anchor | null>(null);
const moments = ref<Moment[]>([]);
const followed = ref(false);
const followBusy = ref(false);
const showActions = ref(false);
const swipeIndex = ref(0);
const swipeRef = ref<{ swipeTo: (i: number) => void } | null>(null);

const isVip = computed(() => userStore.isVip);
// VIP 视频通话 7 折价
const vipPrice = computed(() => (anchor.value ? Math.round(anchor.value.price * 0.7) : 0));
const effectivePrice = computed(() => (isVip.value ? vipPrice.value : anchor.value?.price || 0));

// 魅力勋章等级:后端暂无,占位 0(对齐参考图视觉)
const medalLevel = 0;

// 真实已收礼物墙(item/userAchieve/giftPage),由 onMounted 加载
const receivedGifts = ref<ReceivedGift[]>([]);

const gallery = computed(() => {
  if (!anchor.value) return [];
  return [anchor.value.avatar, ...moments.value.map((m) => m.images[0])].filter(Boolean);
});

// 动态列表里混有纯文字/语音动态(mediaUrls 为空),付费相册只展示真正带图的
const photoMoments = computed(() => moments.value.filter((m) => m.images[0]));

// Profile 资料 pill(身高/体重/感情;后端无则用占位值对齐参考图)
const profilePills = computed(() => {
  const a = anchor.value;
  if (!a) return [];
  return [
    { key: "h", icon: Ruler, text: `${a.height ?? 165}cm` },
    { key: "w", icon: Dumbbell, text: `${a.weight ?? 60}kg` },
    { key: "r", icon: Heart, text: a.relationship || "Single" }
  ];
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

// 付费相册:后端无单张解锁概念,沿用礼物送礼同款做法——真实钱包余额校验 + 本地扣减(userStore.addCoins)。
const paidPhotoPrice = 30;
const unlockedPaid = ref<Set<number>>(new Set());

async function onPaidPhotoClick(img: string, i: number) {
  if (unlockedPaid.value.has(i)) {
    preview(img);
    return;
  }
  try {
    await showConfirmDialog({
      title: t("anchor.paidPicture"),
      message: t("anchor.unlockConfirm", { n: paidPhotoPrice }),
      confirmButtonText: t("anchor.unlockFor", { n: paidPhotoPrice }),
      cancelButtonText: t("common.cancel")
    });
  } catch {
    return; // 用户取消
  }
  if (userStore.coins < paidPhotoPrice) {
    emitter.emit("toast", t("anchor.notEnoughCoins"));
    router.push("/recharge");
    return;
  }
  userStore.addCoins(-paidPhotoPrice);
  unlockedPaid.value.add(i);
  emitter.emit("toast", t("anchor.unlocked"));
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
  // 余额不足以支付 1 分钟 → 提示并去充值
  if (userStore.coins < effectivePrice.value) {
    emitter.emit("toast", t("anchor.notEnoughCoins"));
    router.push("/recharge");
    return;
  }
  // 拨号目标必须用路由 id(真实对端):anchor.value 来自 api.getAnchor,
  // 它对未知 id 会回退 mock anchors[0](如 860120)→ 曾导致拨错人(与 CallPage 同坑)
  startOutgoing({ ...anchor.value, id });
  router.push(`/call/${id}`);
}

function startChat() {
  router.push(`/chat/${id}`);
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
  const [a, mp] = await Promise.all([api.getAnchor(id), getUserMomentsPage(id, 0, 9).catch(() => ({ items: [], total: 0 }))]);
  anchor.value = a;
  moments.value = mp.items;
  // 真实大卡覆盖身份 + 关注态 + 相册(mock 主播无真实卡 → 保留 mock 展示)
  try {
    const { overlay, relationStatus } = await fetchAnchorCard(id, userStore.user.id);
    anchor.value = { ...a, ...overlay };
    followed.value = isFollowing(relationStatus);
  } catch {
    /* 真实卡不可用,退回 mock 展示 */
  }
  // 真实已收礼物墙(失败/为空则不展示该区块)
  getReceivedGifts(id)
    .then((g) => (receivedGifts.value = g))
    .catch(() => {});
});
</script>

<style scoped lang="scss">
.detail {
  min-height: 100vh;
  background: var(--eve-bg);
  padding-bottom: 140px;
}

/* van-image 加载/失败占位:默认浅底,改成暗底,避免深色页里闪白块 */
:deep(.van-image__loading),
:deep(.van-image__error) {
  background-color: var(--eve-surface);
  color: var(--eve-faint);
}

/* ===== 封面 ===== */
.cover {
  position: relative;
  .slide {
    width: 100%;
    height: 40vh;
    display: block;
    background: var(--eve-surface);
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

.cover-swipe {
  height: 40vh;
}

/* 左下角相册缩略图指示条(点击可跳转封面对应图);右侧让出悬浮头像圆的位置 */
.thumbs {
  position: absolute;
  left: 14px;
  bottom: 30px;
  z-index: 10;
  display: flex;
  gap: 7px;
  max-width: calc(100% - 120px);
  overflow-x: auto;
  &::-webkit-scrollbar {
    display: none;
  }
  img {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    object-fit: cover;
    flex: 0 0 auto;
    border: 2px solid transparent;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    &.active {
      border-color: #fff;
    }
  }
}

/* 悬浮头像圆:钉在封面右下角,一半压在封面上、一半垂进信息卡 */
.float-avatar {
  position: absolute;
  /* 信息卡恢复通栏,头像圆回到贴近视口右边缘的位置 */
  right: 36px;
  bottom: -22px;
  z-index: 20;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4);
  :deep(.van-image) {
    width: 100%;
    height: 100%;
  }
}

/* ===== 信息卡(悬浮圆角卡,高度随内容自适应) ===== */
.info-card {
  position: relative;
  z-index: 5;
  /* 不留边距,两侧贴齐,占满整行宽度;高度全面收紧 */
  margin: 0;
  padding: 5px 12px;
  background: linear-gradient(135deg, #6a44c4 0%, #4a2d8f 100%);
}

.name-line {
  /* 头像圆压在这一行右上角,只在这一行让出空间,其余内容用满卡片宽度;
     通栏后宽度足够,名字/在线状态合回一行,省一整行高度 */
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  width: 100%;
  padding-right: 76px;
}

.info-name {
  margin: 0;
  min-width: 0;
  font-size: 14px;
  font-weight: 800;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-dot {
  flex: 0 0 auto;
  font-size: 10px;
  display: inline-flex;
  align-items: center;
  color: #fff;
  &::before {
    content: "";
    width: 5px;
    height: 5px;
    border-radius: 50%;
    margin-right: 4px;
    background: currentColor;
  }
  &.online {
    color: var(--eve-green);
  }
  &.busy {
    color: var(--eve-gold);
  }
  &.offline {
    color: rgba(255, 255, 255, 0.55);
  }
}

.id-row {
  /* 用 flex(块级)而非 inline-flex:避免作为孤立行内子元素生成匿名行框,
     被外层继承的行高撑出一截看不见的空白 */
  display: flex;
  width: fit-content;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.75);
}

.info-intro {
  margin: 3px 0 0;
  font-size: 10px;
  line-height: 1.3;
  color: rgba(255, 255, 255, 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.id-badge {
  display: inline-grid;
  place-items: center;
  height: 13px;
  padding: 0 3px;
  border-radius: 3px;
  font-style: normal;
  font-size: 8px;
  font-weight: 800;
  color: #fff;
  background: rgba(0, 0, 0, 0.25);
}

/* Follow 单独一行,右对齐,放在 ID 行与简介之间 */
.card-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}

.follow {
  /* 在上一次尺寸基础上再缩小 20% */
  flex: 0 0 auto;
  height: 22px;
  padding: 0 13px;
  border-radius: 11px;
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;
  color: #7c3aed;
  background: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);

  &.on {
    color: #fff;
    background: rgba(255, 255, 255, 0.18);
    box-shadow: none;
    border: 1px solid rgba(255, 255, 255, 0.5);
  }
}

/* ===== 主体 ===== */
.body {
  margin-top: 20px;
  padding: 0 16px 8px;
}

/* 各区块统一的圆角卡片底(资料/勋章/Profile 等都用同一套,不再是通栏色块) */
.card-surface {
  border-radius: 16px;
  background: var(--eve-surface);
  border: 1px solid var(--eve-line);
}

.stats {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  padding: 14px 12px;

  .stat {
    flex: 0 0 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;
    .label {
      font-size: 12px;
      color: var(--eve-faint);
    }
    .val {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      gap: 2px;
      font-size: 13px;
      font-weight: 700;
      color: #fff;
      .g {
        font-style: normal;
        font-size: 12px;
        color: var(--eve-pink);
      }
    }
  }
  .col-div {
    flex: 0 0 auto;
    width: 1px;
    align-self: center;
    height: 22px;
    background: var(--eve-line);
  }
}

.section {
  margin-top: 24px;
}

.section-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.sec-ic {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  &.m-ic {
    background: linear-gradient(135deg, #ffb04d, #ff7a45);
  }
  &.g-ic {
    background: linear-gradient(135deg, #ff7a9c, #ff4d6d);
  }
  &.p-ic {
    background: linear-gradient(135deg, #9d5cf0, #7c4dd1);
  }
}

.section-title {
  font-size: 16px;
  font-weight: 800;
  color: #fff;
}

/* 勋章卡(占位) */
.medal-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 96px;
  padding: 0 20px;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(120deg, #2c1b52 0%, #4a2d8f 100%);
  .medal-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
    .ml-row {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.85);
      b {
        margin-left: 6px;
        font-size: 26px;
        font-weight: 800;
        color: var(--eve-gold);
      }
    }
    .ml-name {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.7);
    }
  }
  .medal-art {
    display: grid;
    place-items: center;
    width: 58px;
    height: 58px;
    border-radius: 50%;
    color: #fff;
    background: radial-gradient(circle at 36% 30%, #8fc0ff, #4a7be0 58%, #3257c4);
    box-shadow: 0 0 0 4px rgba(120, 170, 255, 0.16), 0 8px 20px rgba(58, 100, 214, 0.55);
  }
}

/* Profile pill */
.pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  background: var(--eve-surface);
  border: 1px solid var(--eve-line);
  &.h {
    color: #ff9f6b;
  }
  &.w {
    color: #ffb04d;
  }
  &.r {
    color: var(--eve-pink);
  }
}

/* Moment */
.moment-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  .moment-thumb {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 10px;
    overflow: hidden;
    background: var(--eve-surface);
  }
}

/* 付费相册:每格独立解锁态,锁住时蒙层模糊 + 价格,解锁后仅剩原图 */
.paid-photo {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 10px;
  overflow: hidden;
}
.paid-mask {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #fff;
  background: rgba(20, 10, 35, 0.45);
  backdrop-filter: blur(7px);
  -webkit-backdrop-filter: blur(7px);
}
.paid-price {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 700;
  img {
    width: 12px;
    height: 12px;
  }
}

/* 相册 */
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
  }
}

/* Gifts 网格 */
.gift-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.gift-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  .gift-box {
    width: 100%;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    border-radius: 14px;
    background: var(--eve-surface);
    border: 1px solid var(--eve-line);
  }
  .gift-img {
    width: 60%;
    height: 60%;
  }
  .count {
    font-size: 13px;
    font-weight: 700;
    color: var(--eve-muted);
  }
}

/* ===== 底部 ===== */
.bottom-wrap {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  width: min(400PX, 100vw);
  bottom: 0;
  z-index: 30;
  padding: 0 14px calc(10px + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, transparent, rgba(11, 7, 18, 0.96) 28%);
}

.vip-bubble {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin: 0 0 10px 4px;
  padding: 7px 14px;
  border-radius: 16px 16px 16px 4px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #7c4dd1, #9d5cf0);
  img {
    width: 14px;
    height: 14px;
  }
  b {
    color: var(--eve-gold);
  }
  .v-mark {
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    font-size: 11px;
    font-weight: 900;
    font-style: italic;
    color: #7c4dd1;
    background: linear-gradient(135deg, #ffd36e, #ffb800);
  }
  &::after {
    content: "";
    position: absolute;
    left: 18px;
    bottom: -5px;
    width: 12px;
    height: 12px;
    background: #9d5cf0;
    transform: rotate(45deg);
    border-radius: 0 0 3px 0;
  }
}

.bottom-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cta {
  flex: 1;
  height: 56px;
  border-radius: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #fff;
  background: linear-gradient(135deg, #7c4dd1, #9d5cf0);
  box-shadow: 0 8px 22px rgba(124, 77, 209, 0.45);
  .cta-text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    line-height: 1.15;
    font-size: 16px;
    font-weight: 800;
    small {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 11px;
      font-weight: 600;
      color: var(--eve-gold);
      img {
        width: 12px;
        height: 12px;
      }
    }
  }
}

.msg-btn {
  flex: 0 0 auto;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: var(--eve-grad);
  box-shadow: var(--eve-glow-pink);
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
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}
</style>
