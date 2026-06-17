<template>
  <section class="page wallet-page">
    <TopBar title="Wallet">
      <button class="text-action" @click="router.push('/wallet-detail')">Bill</button>
    </TopBar>
    <div class="wallet-balance">
      <span>My coins</span>
      <strong>{{ user.coins }}</strong>
    </div>
    <div class="wallet-packages">
      <button v-for="item in packages" :key="item.id" :class="{ selected: selected === item.id }" @click="selected = item.id">
        <strong>{{ item.coins }}</strong>
        <span>+{{ item.bonus }} bonus</span>
        <b>{{ item.price }}</b>
      </button>
    </div>
    <button class="primary-action" @click="goPay">Continue</button>
    <button class="secondary-action" @click="router.push('/recharge')">Open recharge center</button>
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
