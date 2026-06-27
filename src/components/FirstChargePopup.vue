<template>
  <van-popup
    v-model:show="show"
    round
    teleport="body"
    class="fc-popup"
    :z-index="3500"
    @closed="onClosed"
  >
    <div class="fc">
      <div class="fc-hero">
        <span class="badge">x2</span>
        <h2>{{ t("firstCharge.title") }}</h2>
        <p>{{ t("firstCharge.subtitle") }}</p>
      </div>

      <div class="fc-offer">
        <div class="coins">
          <img src="/assets/eve/wallet/coin_20@2x.png" alt="" />
          <strong>600 → 1200</strong>
        </div>
        <span class="price">$4.99</span>
      </div>

      <button class="fc-cta" @click="goRecharge">{{ t("firstCharge.cta") }}</button>
      <button class="fc-close" @click="show = false">{{ t("common.later") }}</button>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useUserStore } from "../stores";

const { t } = useI18n();
const router = useRouter();
const userStore = useUserStore();
const show = ref(false);
let timer: number | null = null;

function goRecharge() {
  show.value = false;
  router.push("/recharge");
}

function onClosed() {
  userStore.setFirstChargeSeen();
}

onMounted(() => {
  // 首次进入、非 VIP 时延迟弹一次
  if (userStore.firstChargeSeen || userStore.isVip) return;
  timer = window.setTimeout(() => {
    if (!userStore.firstChargeSeen) show.value = true;
  }, 1400);
});

onUnmounted(() => {
  if (timer) window.clearTimeout(timer);
});
</script>

<style scoped lang="scss">
.fc {
  width: 300px;
  padding: 0 0 22px;
  background: linear-gradient(180deg, #5a2a3a 0%, #2c1a1a 45%);
  border-radius: 24px;
  overflow: hidden;
  text-align: center;
}

.fc-hero {
  position: relative;
  padding: 30px 20px 18px;
  background: radial-gradient(120% 80% at 50% 0%, rgba(255, 84, 115, 0.45), transparent 70%);

  .badge {
    display: inline-grid;
    place-items: center;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    font-size: 22px;
    font-weight: 800;
    color: #562b00;
    background: linear-gradient(135deg, #ffe08a, #ffc24b);
    box-shadow: 0 6px 18px rgba(255, 194, 75, 0.5);
  }
  h2 {
    margin: 14px 0 6px;
    font-size: 20px;
    font-weight: 800;
    color: #fff;
  }
  p {
    font-size: 13px;
    color: #e8c8d0;
    line-height: 1.5;
  }
}

.fc-offer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 6px 20px 18px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);

  .coins {
    display: flex;
    align-items: center;
    gap: 6px;
    img {
      width: 22px;
      height: 22px;
    }
    strong {
      font-size: 17px;
      color: #ffd36e;
    }
  }
  .price {
    font-size: 16px;
    font-weight: 700;
    color: #fff;
  }
}

.fc-cta {
  width: calc(100% - 40px);
  height: 48px;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(90deg, #ff5473, #eb6300);
  box-shadow: 0 8px 20px rgba(235, 99, 0, 0.4);
}

.fc-close {
  margin-top: 12px;
  font-size: 14px;
  color: #9a8b8b;
}
</style>
