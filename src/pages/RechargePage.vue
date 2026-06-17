<template>
  <section class="page wallet-page recharge-page">
    <TopBar title="Recharge">
      <button class="text-action" @click="router.push('/wallet-detail')">Bill</button>
    </TopBar>

    <div class="recharge-hero">
      <span>Current balance</span>
      <strong>{{ user.coins }}</strong>
      <p>Coins are used for video calls, gifts, and live stream interactions.</p>
    </div>

    <div class="section-title-row">
      <h2>Choose package</h2>
      <span>Best value selected</span>
    </div>

    <div class="wallet-packages recharge-packages">
      <button v-for="item in packages" :key="item.id" :class="{ selected: selected === item.id }" @click="selected = item.id">
        <i v-if="item.selected">Popular</i>
        <strong>{{ item.coins }}</strong>
        <span>+{{ item.bonus }} bonus</span>
        <b>{{ item.price }}</b>
      </button>
    </div>

    <div class="recharge-benefits">
      <span>Secure payment</span>
      <span>Instant arrival</span>
      <span>Receipts in wallet detail</span>
    </div>

    <button class="primary-action" @click="goPay">Continue</button>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import TopBar from "../components/TopBar.vue";
import { eveMockApi } from "../services/eveMockApi";

const router = useRouter();
const user = eveMockApi.getCurrentUser();
const packages = eveMockApi.getWalletPackages();
const selected = ref(packages.find((item) => item.selected)?.id || packages[0].id);

function goPay() {
  router.push({ path: "/payment", query: { packageId: selected.value } });
}
</script>
