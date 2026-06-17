<template>
  <section class="page call-summary">
    <div class="summary-card">
      <img :src="anchor.avatar" alt="" />
      <h1>{{ durationText }}</h1>
      <div class="summary-line">
        <span>Call cost:</span>
        <b><img src="/assets/eve/callDetail/coin_16@2x.png" alt="" /> {{ callCost }}</b>
      </div>
      <div class="summary-line">
        <span>Gift cost:</span>
        <b><img src="/assets/eve/callDetail/coin_16@2x.png" alt="" /> 0</b>
      </div>
      <div class="vip-upsell">
        <span>Get VIP and receive bonus coins immediately.</span>
        <button @click="router.push('/sign-detail')">Get</button>
      </div>
    </div>

    <div class="reason-card">
      <h2>Please select hang up reason</h2>
      <button v-for="reason in reasons" :key="reason" :class="{ selected: selected === reason }" @click="selected = reason">
        <span>{{ reason }}</span>
        <b>{{ selected === reason ? "✓" : "○" }}</b>
      </button>
    </div>

    <button class="primary-action" @click="router.push('/messages')">Confirm</button>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { eveMockApi } from "../services/eveMockApi";

const route = useRoute();
const router = useRouter();
const anchor = eveMockApi.getAnchor(Number(route.params.id));
const duration = Number(route.query.duration || 126);
const selected = ref("Other");
const reasons = ["Other", "Black Screen", "No Voice", "Nobody There", "Video Call Stuck", "Ignore Me"];

const durationText = computed(() => {
  const min = String(Math.floor(duration / 60)).padStart(2, "0");
  const sec = String(duration % 60).padStart(2, "0");
  return `${min}:${sec}`;
});

const callCost = computed(() => Math.max(anchor.price, Math.ceil(duration / 60) * anchor.price));
</script>
