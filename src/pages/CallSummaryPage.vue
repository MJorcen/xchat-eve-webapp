<template>
  <section v-if="anchor" class="summary">
    <div class="card">
      <div class="avatar-ring">
        <img class="avatar" :src="anchor.avatar" alt="" />
      </div>
      <h1 class="duration">{{ durationText }}</h1>
      <p class="ended">{{ t("callSummary.callEnded") }}</p>

      <div class="costs">
        <div class="cost">
          <span>{{ t("callSummary.callCost") }}</span>
          <b><Coins :size="16" :stroke-width="1.8" />{{ callCost }}</b>
        </div>
        <div class="cost">
          <span>{{ t("callSummary.giftCost") }}</span>
          <b><Coins :size="16" :stroke-width="1.8" />{{ giftCost }}</b>
        </div>
      </div>

      <button class="follow" :class="{ on: followed }" @click="toggleFollow">
        {{ followed ? t("common.following") : t("callSummary.followAnchor", { name: anchor.nickname }) }}
      </button>

      <div v-if="!isVip" class="vip-upsell">
        <span>{{ t("callSummary.vipUpsell") }}</span>
        <button @click="router.push('/membership')">{{ t("callSummary.get") }}</button>
      </div>
    </div>

    <button class="confirm" @click="router.replace('/messages')">{{ t("callSummary.confirm") }}</button>

    <!-- 挂断原因(领金币奖励) -->
    <van-popup :show="showReason" round teleport="body" class="rs-popup" :z-index="9940" :close-on-click-overlay="false">
      <div class="rs">
        <span class="rs-chest">🎁</span>
        <p class="rs-title">{{ t("callSummary.reasonTitle") }}</p>
        <div class="rs-list">
          <button
            v-for="r in reasons"
            :key="r.key"
            class="rs-item"
            :class="{ on: selected === r.key }"
            @click="selected = r.key"
          >
            <span class="rs-label">{{ r.label }}</span>
            <span class="rs-radio" :class="{ on: selected === r.key }" />
          </button>
        </div>
        <button class="rs-submit" :class="{ ready: selected }" :disabled="!selected" @click="submitReason">
          {{ common.submit }}
        </button>
        <button class="rs-skip" @click="showReason = false">{{ t("callSummary.skip") }}</button>
      </div>
    </van-popup>

    <!-- 反馈奖励 -->
    <van-popup :show="showReward" round teleport="body" class="rw-popup" :z-index="9941" :close-on-click-overlay="false">
      <div class="rw">
        <span class="rw-chest">💰</span>
        <p class="rw-title">{{ t("callSummary.reward", { n: REWARD }) }}</p>
        <button class="rw-ok" @click="showReward = false">{{ t("callSummary.ok") }}</button>
      </div>
    </van-popup>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { Coins } from "lucide-vue-next";
import emitter from "../common/eventBus";
import { api } from "../services/api";
import { useCall } from "../composables/useCall";
import { useUserStore } from "../stores";
import type { Anchor } from "../types/eve";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { reset } = useCall();

const REWARD = 50;
const id = Number(route.params.id);
const duration = Number(route.query.duration || 0);
const giftCost = Number(route.query.gift || 0);
// 通话费取通话页透传的"实际扣费"金额(与 useCall 的分钟计费一致),不再独立重算
const callCost = Number(route.query.coins || 0);

const anchor = ref<Anchor | null>(null);
const followed = ref(false);
const showReason = ref(false);
const showReward = ref(false);
const selected = ref("");

const isVip = computed(() => userStore.isVip);
const common = computed(() => ({ submit: t("common.submit") }));

const reasons = computed(() => [
  { key: "other", label: t("callSummary.reasonOther") },
  { key: "blackScreen", label: t("callSummary.reasonBlackScreen") },
  { key: "noVoice", label: t("callSummary.reasonNoVoice") },
  { key: "nobody", label: t("callSummary.reasonNobody") },
  { key: "stuck", label: t("callSummary.reasonStuck") },
  { key: "ignore", label: t("callSummary.reasonIgnore") }
]);

const durationText = computed(() => {
  const m = String(Math.floor(duration / 60)).padStart(2, "0");
  const s = String(duration % 60).padStart(2, "0");
  return `${m}:${s}`;
});

function toggleFollow() {
  followed.value = !followed.value;
  emitter.emit("toast", followed.value ? t("callSummary.followed") : t("callSummary.unfollowed"));
}

function submitReason() {
  if (!selected.value) return;
  showReason.value = false;
  emitter.emit("toast", t("callSummary.submitOk"));
  userStore.addCoins(REWARD);
  showReward.value = true;
}

onMounted(async () => {
  anchor.value = await api.getAnchor(id);
  reset(); // 结算后复位通话状态
  // 仅在真实接通(有时长)后提示挂断原因领奖励
  if (duration > 0) showReason.value = true;
});
</script>

<style scoped lang="scss">
.summary {
  position: fixed;
  inset: 0;
  left: 50%;
  transform: translateX(-50%);
  width: min(400PX, 100vw);
  z-index: 40;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 22px;
  padding: 24px;
  background: rgba(8, 5, 14, 0.94);
}

.card {
  width: 100%;
  max-width: 320px;
  padding: 28px 20px 22px;
  border-radius: 24px;
  background: linear-gradient(180deg, #1d142b, #0b0712);
  border: 1px solid var(--eve-line);
  text-align: center;
}

.avatar-ring {
  width: 90px;
  height: 90px;
  margin: 0 auto;
  border-radius: 50%;
  padding: 3px;
  background: conic-gradient(from 210deg, #ff2a7a, #9945ff, #ffb800, #ff2a7a);
}
.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #0b0712;
}

.duration {
  margin: 14px 0 2px;
  font-size: 26px;
  font-weight: 800;
  color: #fff;
}

.ended {
  font-size: 13px;
  color: var(--eve-muted);
  margin-bottom: 18px;
}

.costs {
  display: flex;
  gap: 12px;
  margin-bottom: 18px;
}

.cost {
  flex: 1;
  padding: 12px;
  border-radius: 14px;
  background: var(--eve-surface);
  border: 1px solid var(--eve-line);

  span {
    display: block;
    font-size: 12px;
    color: var(--eve-faint);
    margin-bottom: 6px;
  }
  b {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 18px;
    color: var(--eve-gold);
  }
}

.follow {
  width: 100%;
  height: 44px;
  border-radius: 22px;
  background: var(--eve-grad);
  box-shadow: var(--eve-glow-pink);
  color: #fff;
  font-weight: 700;
  font-size: 14px;

  &.on {
    background: transparent;
    box-shadow: none;
    border: 1px solid rgba(255, 255, 255, 0.4);
  }
}

.vip-upsell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 14px;
  background: linear-gradient(120deg, #2a1940, #3b1230);
  border: 1px solid var(--eve-line);
  text-align: left;

  span {
    font-size: 12px;
    color: var(--eve-gold);
  }
  button {
    flex: 0 0 auto;
    padding: 6px 18px;
    border-radius: 16px;
    background: linear-gradient(135deg, #ffd36e, #ffb800);
    color: #1a1020;
    font-weight: 800;
    font-size: 13px;
  }
}

.confirm {
  width: 100%;
  max-width: 320px;
  height: 50px;
  border-radius: 25px;
  background: var(--eve-grad);
  box-shadow: var(--eve-glow-pink);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
}

/* 原因弹窗 */
.rs {
  width: 300px;
  padding: 22px 20px 18px;
  background: linear-gradient(180deg, #1d142b, #0b0712);
  border: 1px solid var(--eve-line);
  border-radius: 22px;
  text-align: center;

  .rs-chest {
    font-size: 40px;
  }
  .rs-title {
    margin: 8px 0 16px;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    line-height: 1.4;
  }
  .rs-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .rs-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 11px 14px;
    border-radius: 12px;
    background: var(--eve-surface);
    border: 1px solid var(--eve-line);
    .rs-label {
      font-size: 14px;
      color: var(--eve-text);
    }
    .rs-radio {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid var(--eve-faint);
      &.on {
        border-color: var(--eve-pink);
        background: radial-gradient(circle, var(--eve-pink) 0 5px, transparent 6px);
      }
    }
    &.on {
      border-color: var(--eve-pink);
    }
  }
  .rs-submit {
    width: 100%;
    height: 46px;
    margin-top: 18px;
    border-radius: 23px;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    background: var(--eve-surface-2);
    opacity: 0.5;
    &.ready {
      opacity: 1;
      background: var(--eve-grad);
      box-shadow: var(--eve-glow-pink);
    }
  }
  .rs-skip {
    margin-top: 12px;
    font-size: 14px;
    color: var(--eve-muted);
  }
}

/* 奖励弹窗 */
.rw {
  width: 280px;
  padding: 28px 22px 22px;
  background: linear-gradient(180deg, #1d142b, #0b0712);
  border: 1px solid var(--eve-line);
  border-radius: 22px;
  text-align: center;

  .rw-chest {
    font-size: 48px;
  }
  .rw-title {
    margin: 14px 0 20px;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    line-height: 1.45;
  }
  .rw-ok {
    width: 100%;
    height: 46px;
    border-radius: 23px;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    background: var(--eve-grad);
    box-shadow: var(--eve-glow-pink);
  }
}
</style>
