<template>
  <section class="payment">
    <TopBar :title="t('payment.title')" />

    <!-- 订单金额 -->
    <div class="order">
      <strong class="price">{{ pkg?.price }}</strong>
      <p class="coins">
        <img src="/assets/eve/wallet/coin_20@2x.png" alt="" />
        {{ pkg?.coins }} {{ t("payment.coins") }} <span class="bonus">+{{ pkg?.bonus }} {{ t("payment.bonus") }}</span>
      </p>
    </div>

    <!-- 支付方式 -->
    <div class="section-head">
      <h2>{{ t("payment.paymentMethod") }}</h2>
      <span>{{ t("payment.available", { count: channels.length }) }}</span>
    </div>
    <div class="channels">
      <button
        v-for="c in channels"
        :key="c.id"
        class="channel"
        :class="{ active: channelId === c.id }"
        @click="channelId = c.id"
      >
        <i class="mark">{{ c.mark }}</i>
        <div class="info">
          <strong>
            <span class="cname">{{ c.name }}</span>
            <b v-if="c.recommended" class="rec">{{ t("payment.recommended") }}</b>
          </strong>
          <span class="desc">{{ c.description }}</span>
        </div>
        <span class="radio" :class="{ on: channelId === c.id }" />
      </button>
    </div>

    <!-- 到账明细 -->
    <div class="summary">
      <div class="row"><span>{{ t("payment.coinsLabel") }}</span><b>{{ pkg?.coins }}</b></div>
      <div class="row"><span>{{ t("payment.bonusLabel") }}</span><b class="gold">+{{ pkg?.bonus }}</b></div>
      <div class="row total"><span>{{ t("payment.totalArrival") }}</span><b>{{ (pkg?.coins || 0) + (pkg?.bonus || 0) }}</b></div>
    </div>

    <button class="pay" :disabled="!channelId" @click="submitPayment">{{ t("payment.pay", { price: pkg?.price }) }}</button>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import TopBar from "../components/TopBar.vue";
import { api } from "../services/api";
import { useUserStore } from "../stores";
import type { PaymentChannel, WalletPackage } from "../types/eve";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const packages = ref<WalletPackage[]>([]);
const channels = ref<PaymentChannel[]>([]);
const channelId = ref("");

const pkg = computed(() => {
  const raw = Array.isArray(route.query.packageId) ? route.query.packageId[0] : route.query.packageId;
  const id = Number(raw);
  return packages.value.find((p) => p.id === id) || packages.value[0];
});
const channel = computed(() => channels.value.find((c) => c.id === channelId.value));

function submitPayment() {
  if (!pkg.value || !channel.value) return;
  const arrival = pkg.value.coins + pkg.value.bonus;
  // 在此一次性入账，结算页仅作展示回执；用 replace 让支付页不留在历史里
  userStore.addCoins(arrival);
  router.replace({
    path: "/payment-result",
    query: {
      status: "success",
      coins: arrival,
      amount: pkg.value.price,
      method: channel.value.name
    }
  });
}

onMounted(async () => {
  [packages.value, channels.value] = await Promise.all([api.getWalletPackages(), api.getPaymentChannels()]);
  channelId.value = channels.value.find((c) => c.recommended)?.id || channels.value[0]?.id || "";
});
</script>

<style scoped lang="scss">
.payment {
  min-height: 100vh;
  padding-bottom: 96px;
  background: #2c1a1a;
}

.order {
  margin: 14px 16px 0;
  padding: 18px 16px;
  border-radius: 16px;
  background: #3a2526;

  .price {
    font-size: 30px;
    font-weight: 800;
    color: #fff;
  }
  .coins {
    margin-top: 6px;
    font-size: 13px;
    color: #9a8b8b;
    display: flex;
    align-items: center;
    gap: 6px;
    img {
      width: 18px;
      height: 18px;
    }
    .bonus {
      color: #ffd36e;
    }
  }
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 18px 18px 8px;
  h2 {
    font-size: 15px;
    font-weight: 700;
    color: #fff;
  }
  span {
    font-size: 12px;
    color: #9a8b8b;
  }
}

.channel {
  display: flex;
  align-items: center;
  gap: 12px;
  width: calc(100% - 32px);
  margin: 0 16px 10px;
  padding: 14px;
  border-radius: 14px;
  background: #3a2526;
  border: 1.5px solid transparent;
  text-align: left;

  &.active {
    border-color: #eb6300;
    background: rgba(235, 99, 0, 0.1);
  }
  .mark {
    flex: 0 0 auto;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    font-size: 12px;
    font-weight: 700;
    font-style: normal;
    color: #fff;
    background: linear-gradient(135deg, #ff5473, #eb6300);
  }
  .info {
    flex: 1;
    min-width: 0;
    strong {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      column-gap: 6px;
      row-gap: 4px;
      font-size: 14px;
      color: #fff;
      .cname {
        white-space: nowrap;
      }
      .rec {
        font-size: 10px;
        font-weight: 500;
        padding: 1px 7px;
        border-radius: 99px;
        color: #fff;
        background: linear-gradient(90deg, #ff5473, #eb6300);
      }
    }
    .desc {
      display: block;
      margin-top: 2px;
      font-size: 11px;
      color: #9a8b8b;
    }
  }
  .radio {
    flex: 0 0 auto;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid #6b5656;
    position: relative;
    &.on {
      border-color: #eb6300;
      &::after {
        content: "";
        position: absolute;
        inset: 3px;
        border-radius: 50%;
        background: #eb6300;
      }
    }
  }
}

.summary {
  margin: 14px 16px 0;
  padding: 6px 16px;
  border-radius: 16px;
  background: #3a2526;

  .row {
    display: flex;
    justify-content: space-between;
    padding: 11px 0;
    font-size: 13px;
    color: #9a8b8b;
    & + .row {
      border-top: 1px solid #241213;
    }
    b {
      color: #fff;
      font-weight: 600;
    }
    .gold {
      color: #ffd36e;
    }
    &.total b {
      font-size: 16px;
      font-weight: 800;
    }
  }
}

.pay {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;
  width: min(400PX, 100vw);
  padding: 14px 16px calc(14px + env(safe-area-inset-bottom));
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(90deg, #ff5473, #eb6300);

  &:disabled {
    opacity: 0.6;
  }
}
</style>
