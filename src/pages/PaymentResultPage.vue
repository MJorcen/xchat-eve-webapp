<template>
  <section class="page payment-result-page">
    <TopBar title="Payment Result" />

    <div class="payment-result-card" :class="{ failed: !success }">
      <i>{{ success ? "✓" : "!" }}</i>
      <h1>{{ success ? "Payment successful" : "Payment failed" }}</h1>
      <p>{{ success ? "Coins have been added to your wallet." : "The payment was not completed. Please try another method." }}</p>
    </div>

    <div class="payment-summary result-summary">
      <div>
        <span>Status</span>
        <b>{{ success ? "Success" : "Failed" }}</b>
      </div>
      <div>
        <span>Arrival coins</span>
        <b>{{ coins }}</b>
      </div>
      <div>
        <span>Amount</span>
        <b>{{ amount }}</b>
      </div>
      <div>
        <span>Method</span>
        <b>{{ method }}</b>
      </div>
    </div>

    <button class="primary-action" @click="router.push('/wallet')">Back to wallet</button>
    <button class="secondary-action" @click="router.push('/messages')">Return to chat</button>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import TopBar from "../components/TopBar.vue";

const route = useRoute();
const router = useRouter();
const success = computed(() => route.query.status !== "failed");
const coins = computed(() => Number(Array.isArray(route.query.coins) ? route.query.coins[0] : route.query.coins) || 0);
const amount = computed(() => (Array.isArray(route.query.amount) ? route.query.amount[0] : route.query.amount) || "$0.00");
const method = computed(() => (Array.isArray(route.query.method) ? route.query.method[0] : route.query.method) || "Credit / Debit Card");
</script>
