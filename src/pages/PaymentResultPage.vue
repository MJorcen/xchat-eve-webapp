<template>
  <section class="result">
    <TopBar :title="t('paymentResult.title')" />

    <div class="card">
      <div class="badge" :class="{ fail: !success }">{{ success ? "✓" : "!" }}</div>
      <h1>{{ success ? t("paymentResult.successHeading") : t("paymentResult.failHeading") }}</h1>
      <p>{{ success ? t("paymentResult.successDesc") : t("paymentResult.failDesc") }}</p>
    </div>

    <div v-if="success" class="arrival">
      <img src="/assets/eve/wallet/coin_20@2x.png" alt="" />
      <strong>+{{ coins }}</strong>
    </div>

    <div class="summary">
      <div class="row"><span>{{ t("paymentResult.status") }}</span><b :class="success ? 'ok' : 'bad'">{{ success ? t("paymentResult.statusSuccess") : t("paymentResult.statusFailed") }}</b></div>
      <div class="row"><span>{{ t("paymentResult.arrivalCoins") }}</span><b>{{ coins }}</b></div>
      <div class="row"><span>{{ t("paymentResult.amount") }}</span><b>{{ amount }}</b></div>
      <div class="row"><span>{{ t("paymentResult.method") }}</span><b>{{ method }}</b></div>
    </div>

    <button class="primary" @click="router.replace('/wallet')">{{ t("paymentResult.backToWallet") }}</button>
    <button class="secondary" @click="router.replace('/messages')">{{ t("paymentResult.continueChatting") }}</button>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import TopBar from "../components/TopBar.vue";

// 纯回执页：金币已在 PaymentPage 入账，这里不再变更余额（避免刷新/返回重复入账）
const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const success = computed(() => route.query.status !== "failed");
const coins = computed(() => Number(Array.isArray(route.query.coins) ? route.query.coins[0] : route.query.coins) || 0);
const amount = computed(() => (Array.isArray(route.query.amount) ? route.query.amount[0] : route.query.amount) || "$0.00");
const method = computed(() => (Array.isArray(route.query.method) ? route.query.method[0] : route.query.method) || "Credit / Debit Card");
</script>

<style scoped lang="scss">
.result {
  min-height: 100vh;
  padding-bottom: 40px;
  background: var(--eve-bg);
  text-align: center;
}

.card {
  margin: 28px 16px 0;
  padding: 28px 16px;
  border-radius: 18px;
  background: var(--eve-surface);

  .badge {
    width: 72px;
    height: 72px;
    margin: 0 auto;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 38px;
    color: #fff;
    background: var(--eve-green);
    animation: pop 0.45s ease-out;
    &.fail {
      background: var(--eve-pink);
    }
  }
  h1 {
    margin-top: 14px;
    font-size: 20px;
    font-weight: 800;
    color: #fff;
  }
  p {
    margin-top: 6px;
    font-size: 13px;
    color: var(--eve-faint);
    line-height: 1.5;
  }
}

@keyframes pop {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  60% {
    transform: scale(1.15);
    opacity: 1;
  }
  100% {
    transform: scale(1);
  }
}

.arrival {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 18px;
  img {
    width: 22px;
    height: 22px;
  }
  strong {
    font-size: 26px;
    font-weight: 800;
    color: var(--eve-gold);
  }
}

.summary {
  margin: 20px 16px 0;
  padding: 6px 16px;
  border-radius: 16px;
  background: var(--eve-surface);
  text-align: left;

  .row {
    display: flex;
    justify-content: space-between;
    padding: 12px 0;
    font-size: 13px;
    color: var(--eve-faint);
    & + .row {
      border-top: 1px solid var(--eve-line);
    }
    b {
      color: #fff;
      font-weight: 600;
    }
    .ok {
      color: var(--eve-green);
    }
    .bad {
      color: var(--eve-pink);
    }
  }
}

.primary {
  display: block;
  width: calc(100% - 32px);
  margin: 22px 16px 10px;
  padding: 14px;
  border-radius: 12px;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  background: var(--eve-grad);
}

.secondary {
  display: block;
  width: calc(100% - 32px);
  margin: 0 16px;
  padding: 13px;
  border-radius: 12px;
  color: #fff;
  font-size: 15px;
  background: transparent;
  border: 1.5px solid var(--eve-surface);
}
</style>
