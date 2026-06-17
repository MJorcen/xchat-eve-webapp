<template>
  <section class="page payment-page">
    <TopBar title="Payment" />

    <article class="payment-order">
      <span>Order amount</span>
      <strong>{{ selectedPackage.price }}</strong>
      <p>{{ selectedPackage.coins }} coins + {{ selectedPackage.bonus }} bonus</p>
    </article>

    <div class="section-title-row">
      <h2>Payment method</h2>
      <span>{{ channels.length }} available</span>
    </div>

    <div class="payment-methods">
      <button v-for="item in channels" :key="item.id" :class="{ selected: channelId === item.id }" @click="channelId = item.id">
        <i>{{ item.mark }}</i>
        <div>
          <strong>{{ item.name }}</strong>
          <span>{{ item.description }}</span>
        </div>
        <b v-if="item.recommended">Recommended</b>
      </button>
    </div>

    <div class="payment-summary">
      <div>
        <span>Coins</span>
        <b>{{ selectedPackage.coins }}</b>
      </div>
      <div>
        <span>Bonus</span>
        <b>{{ selectedPackage.bonus }}</b>
      </div>
      <div>
        <span>Total arrival</span>
        <b>{{ selectedPackage.coins + selectedPackage.bonus }}</b>
      </div>
    </div>

    <button class="primary-action" @click="submitPayment">Pay {{ selectedPackage.price }}</button>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import TopBar from "../components/TopBar.vue";
import { eveMockApi } from "../services/eveMockApi";

const route = useRoute();
const router = useRouter();
const packages = eveMockApi.getWalletPackages();
const channels = eveMockApi.getPaymentChannels();
const channelId = ref(channels.find((item) => item.recommended)?.id || channels[0].id);

const selectedPackage = computed(() => {
  const rawPackageId = Array.isArray(route.query.packageId) ? route.query.packageId[0] : route.query.packageId;
  const packageId = Number(rawPackageId) || packages[0].id;
  return packages.find((item) => item.id === packageId) || packages[0];
});

const selectedChannel = computed(() => channels.find((item) => item.id === channelId.value) || channels[0]);

function submitPayment() {
  router.push({
    path: "/payment-result",
    query: {
      status: "success",
      coins: selectedPackage.value.coins + selectedPackage.value.bonus,
      amount: selectedPackage.value.price,
      method: selectedChannel.value.name
    }
  });
}
</script>
