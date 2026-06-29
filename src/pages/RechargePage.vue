<template>
  <section class="recharge">
    <TopBar :title="t('common.recharge')">
      <button class="records" @click="router.push('/wallet-detail')">{{ t("common.records") }}</button>
    </TopBar>

    <div class="hero">
      <span class="label">{{ t("recharge.currentBalance") }}</span>
      <div class="amount">
        <img src="/assets/eve/wallet/coin_20@2x.png" alt="" />
        <strong>{{ coins }}</strong>
      </div>
    </div>

    <div class="section-head"><h2>{{ t("recharge.choosePackage") }}</h2></div>
    <div class="packages">
      <button
        v-for="item in packages"
        :key="item.id"
        class="pkg"
        :class="{ active: selected === item.id }"
        @click="selected = item.id"
      >
        <span v-if="item.selected" class="tag">{{ t("recharge.popular") }}</span>
        <div class="pkg-coins">
          <img src="/assets/eve/wallet/coin_20@2x.png" alt="" />
          <strong>{{ item.coins }}</strong>
        </div>
        <span v-if="item.bonus > 0" class="pkg-bonus">+{{ item.bonus }} {{ t("recharge.bonus") }}</span>
        <span class="pkg-price">{{ item.price }}</span>
      </button>
    </div>

    <div class="benefits">
      <span>✓ {{ t("recharge.securePayment") }}</span>
      <span>✓ {{ t("recharge.instantArrival") }}</span>
      <span>✓ {{ t("recharge.receiptsInRecords") }}</span>
    </div>

    <button class="continue" @click="goPay">{{ t("common.continue") }}</button>

    <PaymentSheet
      v-model:show="showSheet"
      :title="t('payment.paymentMethod')"
      :amount="selectedPkg?.price || ''"
      @pay="onPay"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import TopBar from "../components/TopBar.vue";
import PaymentSheet from "../components/PaymentSheet.vue";
import { getRechargeProducts } from "../services/recharge";
import { useUserStore } from "../stores";
import type { PaymentChannel, WalletPackage } from "../types/eve";

const { t } = useI18n();
const router = useRouter();
const userStore = useUserStore();
const packages = ref<WalletPackage[]>([]);
const selected = ref<number>(0);
const showSheet = ref(false);

const coins = computed(() => userStore.coins);
const selectedPkg = computed(() => packages.value.find((p) => p.id === selected.value));

function goPay() {
  if (selectedPkg.value) showSheet.value = true;
}

// 占位:支付未接真实(H5/dev 仅原生 IAP 渠道解析、第三方网关 dev 未配,无法闭环)。
// 真实流程应为 POST /trade/recharge/create → 拿 redirectUrl 跳转支付,完成后由网关回调入账。
function onPay(channel: PaymentChannel) {
  const pkg = selectedPkg.value;
  if (!pkg) return;
  const arrival = pkg.coins + pkg.bonus;
  userStore.addCoins(arrival);
  showSheet.value = false;
  router.replace({
    path: "/payment-result",
    query: { status: "success", coins: arrival, amount: pkg.price, method: channel.name }
  });
}

onMounted(async () => {
  packages.value = await getRechargeProducts().catch(() => []);
  selected.value = packages.value.find((p) => p.selected)?.id || packages.value[0]?.id || 0;
});
</script>

<style scoped lang="scss">
.recharge {
  min-height: 100vh;
  padding-bottom: 96px;
  background: var(--eve-bg);
}

.records {
  font-size: 13px;
  color: var(--eve-gold);
}

.hero {
  margin: 8px 16px 0;
  padding: 20px 18px;
  border-radius: 18px;
  background: linear-gradient(135deg, #2a1940 0%, var(--eve-surface) 100%);
  text-align: center;

  .label {
    font-size: 13px;
    color: var(--eve-muted);
  }
  .amount {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 8px;
    img {
      width: 26px;
      height: 26px;
    }
    strong {
      font-size: 32px;
      font-weight: 800;
      color: var(--eve-gold);
    }
  }
}

.section-head {
  padding: 20px 18px 8px;
  h2 {
    font-size: 15px;
    font-weight: 700;
    color: #fff;
  }
}

.packages {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  padding: 0 16px;
}

.pkg {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 18px 8px 14px;
  border-radius: 14px;
  background: var(--eve-surface);
  border: 1.5px solid transparent;

  &.active {
    border-color: var(--eve-pink);
    background: rgba(255, 42, 122, 0.08);
  }
  .tag {
    position: absolute;
    top: -8px;
    right: 10px;
    padding: 2px 9px;
    border-radius: 99px;
    font-size: 10px;
    color: #fff;
    background: var(--eve-grad);
  }
  .pkg-coins {
    display: flex;
    align-items: center;
    gap: 5px;
    img {
      width: 20px;
      height: 20px;
    }
    strong {
      font-size: 20px;
      font-weight: 800;
      color: #fff;
    }
  }
  .pkg-bonus {
    font-size: 12px;
    color: var(--eve-gold);
  }
  .pkg-price {
    margin-top: 4px;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
  }
}

.benefits {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  padding: 18px;
  font-size: 12px;
  color: var(--eve-faint);
}

.continue {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;
  width: min(400PX, 100vw);
  padding: 14px 16px calc(14px + env(safe-area-inset-bottom));
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  background: var(--eve-grad);
}
</style>
