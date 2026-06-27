<template>
  <section v-if="anchor" class="match-detail">
    <TopBar :title="matched ? t('matchDetail.matchedTitle') : t('matchDetail.matchingTitle')">
      <button class="report" @click="router.push(`/block-and-report?id=${anchor.id}`)">
        <van-icon name="warning-o" />
      </button>
    </TopBar>

    <div class="card">
      <van-image fit="cover" class="portrait" :src="anchor.avatar" lazy-load />
      <div class="scrim" />
      <div class="meta">
        <span v-if="anchor.online" class="dot" />
        <strong>{{ anchor.nickname }}</strong>
        <span class="age">{{ anchor.age }}</span>
        <img class="flag" :src="countryFlag(anchor.region)" alt="" />
      </div>
    </div>

    <p class="prompt">{{ promptText }}</p>
    <button class="heart" @click="onHeart">{{ userLiked || matched ? "❤️" : "🤍" }}</button>

    <div v-if="!matched" class="reveal">
      <p class="reveal-tip">{{ t("matchDetail.revealTip", { remain }) }}</p>
      <div class="track"><i :style="{ width: progress + '%' }" /></div>
    </div>

    <div class="actions">
      <button v-if="matched" class="accept" @click="accept">{{ t("matchDetail.startVideoCall") }}</button>
      <button class="next" @click="rematch">{{ matched ? t("common.later") : t("matchDetail.next") }}</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import emitter from "../common/eventBus";
import { api } from "../services/api";
import { useCall } from "../composables/useCall";
import { countryFlag } from "../utils/assets";
import type { Anchor } from "../types/eve";

const { t } = useI18n();
const router = useRouter();
const { startOutgoing } = useCall();

let pool: Anchor[] = [];
const anchor = ref<Anchor | null>(null);
const hostLiked = ref(false);
const userLiked = ref(false);
const matched = ref(false);
const progress = ref(0);
const remain = ref(10);
const timers: number[] = [];

const promptText = computed(() => {
  if (matched.value) return t("matchDetail.promptMatched");
  if (hostLiked.value && !userLiked.value) return t("matchDetail.promptLikedYou");
  return t("matchDetail.promptTapHeart");
});

function clearTimers() {
  timers.forEach((t) => {
    window.clearInterval(t);
    window.clearTimeout(t);
  });
  timers.length = 0;
}

function startRound() {
  clearTimers();
  hostLiked.value = false;
  userLiked.value = false;
  matched.value = false;
  progress.value = 0;
  remain.value = 10;

  // 进度条 + 倒计时
  timers.push(window.setInterval(() => {
    progress.value = Math.min(100, progress.value + 1);
    remain.value = Math.max(0, Math.ceil((100 - progress.value) / 10));
    if (progress.value >= 100 && !matched.value) rematch();
  }, 100));
  // 对方在 1-5s 随机点赞
  timers.push(window.setTimeout(() => (hostLiked.value = true), 1000 + Math.random() * 4000));
}

function checkMatch() {
  if (hostLiked.value && userLiked.value && !matched.value) {
    matched.value = true;
    clearTimers();
    emitter.emit("toast", t("matchDetail.matchedTitle"));
  }
}

function onHeart() {
  userLiked.value = true;
  checkMatch();
}

function pick() {
  const others = pool.filter((a) => a.id !== anchor.value?.id);
  anchor.value = others[Math.floor(Math.random() * others.length)] || pool[0];
}

// 免费重配(同一付费会话内)
function rematch() {
  pick();
  startRound();
}

function accept() {
  if (!anchor.value) return;
  startOutgoing(anchor.value);
  router.push(`/call/${anchor.value.id}`);
}

onMounted(async () => {
  pool = await api.getAnchors();
  anchor.value = pool[0];
  startRound();
});

onUnmounted(clearTimers);
</script>

<style scoped lang="scss">
.match-detail {
  min-height: 100vh;
  padding-bottom: 24px;
  background: #2c1a1a;
  text-align: center;
}
.report :deep(.van-icon) {
  color: #9a8b8b;
  font-size: 18px;
}
.card {
  position: relative;
  margin: 8px 16px 0;
  height: 56vh;
  border-radius: 24px;
  overflow: hidden;
  .portrait {
    width: 100%;
    height: 100%;
  }
  .scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(transparent 55%, rgba(0, 0, 0, 0.7));
  }
  .meta {
    position: absolute;
    left: 16px;
    bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #00e397;
    }
    strong {
      font-size: 20px;
      font-weight: 700;
      color: #fff;
    }
    .age {
      padding: 2px 8px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.15);
      font-size: 12px;
      color: #fff;
    }
    .flag {
      width: 20px;
      height: 14px;
      border-radius: 3px;
    }
  }
}
.prompt {
  margin-top: 22px;
  font-size: 16px;
  color: #fff;
}
.heart {
  margin-top: 14px;
  font-size: 64px;
  line-height: 1;
  transition: transform 0.2s;
  &:active {
    transform: scale(0.9);
  }
}
.reveal {
  margin: 18px 16px 0;
  .reveal-tip {
    font-size: 12px;
    color: #9a8b8b;
    margin-bottom: 8px;
  }
  .track {
    height: 6px;
    border-radius: 6px;
    background: #241213;
    overflow: hidden;
    i {
      display: block;
      height: 100%;
      background: linear-gradient(90deg, #ff5473, #eb6300);
      transition: width 0.1s linear;
    }
  }
}
.actions {
  margin: 22px 16px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  .accept {
    height: 50px;
    border-radius: 25px;
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    background: linear-gradient(135deg, #ff5473, #eb6300);
  }
  .next {
    font-size: 15px;
    color: #9a8b8b;
  }
}
</style>
