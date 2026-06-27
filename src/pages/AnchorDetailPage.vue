<template>
  <section v-if="anchor" class="detail">
    <!-- 头图轮播 -->
    <div class="swiper-box">
      <van-swipe :autoplay="3500" :show-indicators="false" @change="(i: number) => (swipeIndex = i)" ref="swipeRef">
        <van-swipe-item v-for="(img, i) in gallery" :key="i">
          <van-image fit="cover" class="slide" :src="img" @click="preview(img)" />
        </van-swipe-item>
      </van-swipe>

      <button class="circle back" @click="router.back()"><van-icon name="arrow-left" /></button>
      <button class="circle more" @click="showActions = true">
        <img src="/assets/eve/anchorDetail/sandian.png" alt="" />
      </button>

      <button class="follow" :class="{ on: followed }" @click="toggleFollow">
        {{ followed ? t("common.following") : `+ ${t("common.follow")}` }}
      </button>

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
            <img src="/assets/eve/anchorDetail/ic_copyid@2x.png" alt="" />
          </button>
        </div>
        <van-image round fit="cover" class="head-avatar" :src="anchor.avatar" @click="preview(anchor.avatar)" />
      </div>

      <p class="bio">{{ anchor.intro }}</p>

      <div class="stats">
        <div class="stat">
          <img src="/assets/eve/anchorDetail/ic_gender@2x.png" alt="" />
          <span>{{ t("anchor.female") }}</span>
        </div>
        <i class="div" />
        <div class="stat">
          <img src="/assets/eve/anchorDetail/ic_age@2x.png" alt="" />
          <span>{{ anchor.age }}</span>
        </div>
        <i class="div" />
        <div class="stat">
          <img class="flag" :src="countryFlag(anchor.region)" alt="" />
          <span>{{ anchor.region.toUpperCase() }}</span>
        </div>
        <i class="div" />
        <div class="stat">
          <img src="/assets/eve/anchorDetail/ic_followers@2x.png" alt="" />
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
        <div class="chips">
          <span v-for="(tag, i) in anchor.tags" :key="tag" class="chip" :class="`c${i % 3}`">{{ tag }}</span>
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
        <img src="/assets/eve/anchorDetail/ic_call_video@2x.png" alt="" />
        <span class="cta-text">
          {{ t("anchor.videoCall") }}
          <small><img src="/assets/eve/callDialog/coin_300@2x.png" alt="" />{{ anchor.price }}{{ t("anchor.perMin") }}</small>
        </span>
      </button>
      <button class="msg-btn" @click="startChat">
        <img src="/assets/eve/anchorDetail/ic_call_message@2x.png" alt="" />
      </button>
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
import { showImagePreview } from "vant";
import emitter from "../common/eventBus";
import { api } from "../services/api";
import { useCall } from "../composables/useCall";
import { countryFlag } from "../utils/assets";
import type { Anchor, Moment } from "../types/eve";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { startOutgoing } = useCall();

const id = Number(route.params.id);
const anchor = ref<Anchor | null>(null);
const moments = ref<Moment[]>([]);
const followed = ref(false);
const showActions = ref(false);
const swipeIndex = ref(0);
const swipeRef = ref<{ swipeTo: (i: number) => void } | null>(null);

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

function toggleFollow() {
  followed.value = !followed.value;
  emitter.emit("toast", followed.value ? t("anchor.followed") : t("anchor.unfollowed"));
}

function startCall() {
  if (!anchor.value) return;
  startOutgoing(anchor.value);
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
  const [a, m] = await Promise.all([api.getAnchor(id), api.getUserMoments(id)]);
  anchor.value = a;
  moments.value = m;
});
</script>

<style scoped lang="scss">
.detail {
  min-height: 100vh;
  background: #2c1a1a;
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
  top: 14px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  z-index: 10;
  color: #fff;
  font-size: 18px;
  img {
    width: 18px;
    height: 18px;
  }
}
.back {
  left: 14px;
}
.more {
  right: 14px;
}

.follow {
  position: absolute;
  right: 14px;
  bottom: 58px;
  z-index: 10;
  height: 30px;
  padding: 0 16px;
  border-radius: 15px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(90deg, #ff5473, #eb6300);

  &.on {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.5);
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
    border-radius: 6px;
    object-fit: cover;
    flex: 0 0 auto;
    border: 2px solid transparent;
    &.active {
      border-color: #fff;
    }
  }
}

.panel {
  position: relative;
  margin-top: -20px;
  padding: 18px 16px 8px;
  border-radius: 20px 20px 0 0;
  background: #2c1a1a;
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
    font-size: 20px;
    font-weight: 700;
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
    }
    &.online {
      color: #00e397;
    }
    &.busy {
      color: #ffd36e;
    }
    &.offline {
      color: #9a8b8b;
    }
  }
}

.id-row {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
  font-size: 12px;
  color: #9a8b8b;
  img {
    width: 14px;
    height: 14px;
  }
}

.head-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  flex: 0 0 auto;
}

.bio {
  margin: 12px 0;
  font-size: 13px;
  line-height: 1.5;
  color: #c8b8b8;
}

.stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-top: 1px solid #241213;

  .stat {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    img {
      height: 16px;
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
    height: 24px;
    background: #241213;
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
  font-weight: 600;
  color: #fff;
}

.more-link {
  font-size: 12px;
  color: #9a8b8b;
}

.moment-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  .moment-thumb {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 8px;
    overflow: hidden;
  }
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
  .chip {
    padding: 6px 12px;
    border-radius: 14px;
    font-size: 12px;
    &.c0 {
      background: rgba(235, 99, 0, 0.15);
      color: #eb6300;
    }
    &.c1 {
      background: rgba(255, 84, 115, 0.15);
      color: #ff5473;
    }
    &.c2 {
      background: rgba(0, 227, 151, 0.12);
      color: #00e397;
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
    gap: 4px;
    flex: 0 0 auto;
    .face {
      font-size: 34px;
    }
    .count {
      font-size: 12px;
      color: #ffd36e;
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
  background: #2c1a1a;
  border-top: 1px solid #241213;
}

.cta {
  flex: 1;
  height: 52px;
  border-radius: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(90deg, #ff5473, #eb6300);
  img {
    width: 24px;
    height: 24px;
  }
  .cta-text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    line-height: 1.1;
    small {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 11px;
      font-weight: 500;
      color: #ffe1c0;
      img {
        width: 12px;
        height: 12px;
      }
    }
  }
}

.msg-btn {
  width: 52px;
  height: 52px;
  border-radius: 18px;
  background: #3a2526;
  display: grid;
  place-items: center;
  img {
    width: 26px;
    height: 26px;
  }
}
</style>
