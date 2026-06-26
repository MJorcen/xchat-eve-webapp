<template>
  <section class="result">
    <TopBar title="Payment Result" />

    <div class="card">
      <div class="badge" :class="{ fail: !success }">{{ success ? "✓" : "!" }}</div>
      <h1>{{ success ? "Payment successful" : "Payment failed" }}</h1>
      <p>{{ success ? "Coins have been added to your wallet." : "The payment was not completed. Please try another method." }}</p>
    </div>

    <div v-if="success" class="arrival">
      <img src="/assets/eve/wallet/coin_20@2x.png" alt="" />
      <strong>+{{ coins }}</strong>
    </div>

    <div class="summary">
      <div class="row"><span>Status</span><b :class="success ? 'ok' : 'bad'">{{ success ? "Success" : "Failed" }}</b></div>
      <div class="row"><span>Arrival coins</span><b>{{ coins }}</b></div>
      <div class="row"><span>Amount</span><b>{{ amount }}</b></div>
      <div class="row"><span>Method</span><b>{{ method }}</b></div>
    </div>

    <button class="primary" @click="router.replace('/wallet')">Back to wallet</button>
    <button class="secondary" @click="router.replace('/messages')">Continue chatting</button>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import TopBar from "../components/TopBar.vue";

// 纯回执页：金币已在 PaymentPage 入账，这里不再变更余额（避免刷新/返回重复入账）
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
  background: #2c1a1a;
  text-align: center;
}

.card {
  margin: 28px 16px 0;
  padding: 28px 16px;
  border-radius: 18px;
  background: #3a2526;

  .badge {
    width: 72px;
    height: 72px;
    margin: 0 auto;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 38px;
    color: #fff;
    background: #00e397;
    animation: pop 0.45s ease-out;
    &.fail {
      background: #ff5473;
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
    color: #9a8b8b;
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
    color: #ffd36e;
  }
}

.summary {
  margin: 20px 16px 0;
  padding: 6px 16px;
  border-radius: 16px;
  background: #3a2526;
  text-align: left;

  .row {
    display: flex;
    justify-content: space-between;
    padding: 12px 0;
    font-size: 13px;
    color: #9a8b8b;
    & + .row {
      border-top: 1px solid #241213;
    }
    b {
      color: #fff;
      font-weight: 600;
    }
    .ok {
      color: #00e397;
    }
    .bad {
      color: #ff5473;
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
  background: linear-gradient(90deg, #ff5473, #eb6300);
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
  border: 1.5px solid #3a2526;
}
</style>
