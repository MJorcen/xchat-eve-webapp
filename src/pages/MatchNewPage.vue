<template>
  <section class="match-new">
    <TopBar title="Match" />

    <div class="hero">
      <van-image v-if="side[0]" round fit="cover" class="side" :src="side[0].avatar" lazy-load />
      <div class="center-card">
        <span class="ring" />
        <van-swipe vertical :autoplay="3000" :show-indicators="false" :loop="true" class="swipe">
          <van-swipe-item v-for="a in anchors" :key="a.id">
            <van-image fit="cover" class="swipe-img" :src="a.avatar" lazy-load />
          </van-swipe-item>
        </van-swipe>
      </div>
      <van-image v-if="side[1]" round fit="cover" class="side" :src="side[1].avatar" lazy-load />
    </div>

    <p class="headline">Thousands of girls are matching now…</p>
    <div class="cost">
      <img src="/assets/eve/matchHome/coin_20@2x.png" alt="" />
      <strong>{{ cost }}</strong> <span>/ match</span>
    </div>
    <p class="balance">Balance: {{ coins }} coins</p>

    <p class="terms">
      Each match costs {{ cost }} coins. Coins are non-refundable once a match starts.
      Be kind and respectful.
    </p>

    <button class="start" @click="start">Start Match</button>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import emitter from "../common/eventBus";
import { api } from "../services/api";
import { useUserStore } from "../stores";
import type { Anchor } from "../types/eve";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const anchors = ref<Anchor[]>([]);
const side = ref<Anchor[]>([]);
// 费用按 MatchPage 选择的档位:Goddess 500 / Random 300
const cost = route.query.type === "Goddess" ? 500 : 300;
const coins = computed(() => userStore.coins);

function start() {
  if (coins.value < cost) {
    emitter.emit("toast", "Insufficient coins");
    router.push("/recharge");
    return;
  }
  userStore.addCoins(-cost);
  emitter.emit("toast", `-${cost} coins`);
  router.push("/match-detail");
}

onMounted(async () => {
  anchors.value = await api.getAnchors();
  side.value = anchors.value.slice(0, 2);
});
</script>

<style scoped lang="scss">
.match-new {
  min-height: 100vh;
  padding-bottom: 110px;
  background: radial-gradient(120% 50% at 50% 0%, #4a2330 0%, #2c1a1a 60%);
  text-align: center;
}
.hero {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
  .side {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    overflow: hidden;
    border: 2px solid rgba(255, 255, 255, 0.2);
  }
}
.center-card {
  position: relative;
  width: 150px;
  height: 220px;
  .ring {
    position: absolute;
    inset: -10px;
    border-radius: 24px;
    border: 2px solid rgba(255, 84, 115, 0.4);
    animation: glow 2s ease-in-out infinite;
  }
  .swipe,
  .swipe-img {
    width: 150px;
    height: 220px;
    border-radius: 20px;
  }
  .swipe-img {
    overflow: hidden;
  }
}
@keyframes glow {
  0%, 100% { box-shadow: 0 0 12px rgba(255, 84, 115, 0.3); }
  50% { box-shadow: 0 0 24px rgba(255, 84, 115, 0.6); }
}
.headline {
  margin-top: 26px;
  font-size: 14px;
  color: #9a8b8b;
}
.cost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 8px 18px;
  border-radius: 999px;
  background: #3a2526;
  img {
    width: 18px;
    height: 18px;
  }
  strong {
    font-size: 18px;
    color: #ffd36e;
  }
  span {
    font-size: 13px;
    color: #9a8b8b;
  }
}
.balance {
  margin-top: 8px;
  font-size: 12px;
  color: #9a8b8b;
}
.terms {
  max-width: 300px;
  margin: 16px auto 0;
  font-size: 11px;
  line-height: 1.6;
  color: #9a8b8b;
}
.start {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 24px;
  width: min(340px, calc(100vw - 32px));
  height: 52px;
  border-radius: 26px;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(135deg, #ff5473, #eb6300);
  box-shadow: 0 10px 24px rgba(255, 84, 115, 0.4);
}
</style>
