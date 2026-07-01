<template>
  <section class="wallet">
    <TopBar :title="t('wallet.title')">
      <button class="records" @click="router.push('/wallet-detail')">{{ t("common.records") }}</button>
    </TopBar>

    <!-- 余额卡 -->
    <div class="balance">
      <span class="label">{{ t("wallet.myCoins") }}</span>
      <div class="amount">
        <img src="/assets/eve/wallet/coin_20@2x.png" alt="" />
        <strong>{{ coins }}</strong>
      </div>
      <p class="tip">{{ t("wallet.coinsTip") }}</p>
    </div>

    <!-- 充值套餐 -->
    <div class="section-head">
      <h2>{{ t("common.recharge") }}</h2>
      <span>{{ t("wallet.secureInstant") }}</span>
    </div>
    <div class="packages">
      <button
        v-for="item in packages"
        :key="item.id"
        class="pkg"
        :class="{ active: selected === item.id }"
        @click="selected = item.id"
      >
        <span v-if="item.selected" class="tag">{{ t("wallet.popular") }}</span>
        <div class="pkg-coins">
          <img src="/assets/eve/wallet/coin_20@2x.png" alt="" />
          <strong>{{ item.coins }}</strong>
        </div>
        <span v-if="item.bonus > 0" class="pkg-bonus">{{ t("wallet.bonus", { n: item.bonus }) }}</span>
        <span class="pkg-price">{{ item.price }}</span>
      </button>
    </div>

    <!-- VIP 入口 -->
    <button class="vip-entry" @click="router.push('/membership')">
      <span class="vip-left">👑 {{ t("wallet.becomeVip") }} <small>{{ t("wallet.vipSubtitle") }}</small></span>
      <van-icon name="arrow" />
    </button>

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
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import TopBar from "../components/TopBar.vue";
import PaymentSheet from "../components/PaymentSheet.vue";
import { useRecharge } from "../composables/useRecharge";

const { t } = useI18n();
const router = useRouter();
// 充值流程(真实 trade 模块)与充值页共用同一套逻辑:真实产品 + 进页拉余额 + 下单入账闭环。
const { packages, selected, showSheet, coins, selectedPkg, goPay, onPay } = useRecharge();
</script>

<style scoped lang="scss">
.wallet {
  min-height: 100vh;
  padding-bottom: 96px;
  background: var(--eve-bg);
}

.records {
  font-size: 13px;
  color: var(--eve-gold);
}

.balance {
  margin: 8px 16px 0;
  padding: 22px 18px;
  border-radius: 18px;
  background: linear-gradient(135deg, #2a1940 0%, var(--eve-surface) 100%);

  .label {
    font-size: 13px;
    color: var(--eve-muted);
  }
  .amount {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 8px 0 10px;
    img {
      width: 28px;
      height: 28px;
    }
    strong {
      font-size: 34px;
      font-weight: 800;
      color: var(--eve-gold);
    }
  }
  .tip {
    font-size: 12px;
    color: var(--eve-muted);
    line-height: 1.4;
  }
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 20px 18px 8px;
  h2 {
    font-size: 15px;
    font-weight: 700;
    color: #fff;
  }
  span {
    font-size: 12px;
    color: var(--eve-faint);
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

.vip-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: calc(100% - 32px);
  margin: 18px 16px 0;
  padding: 14px 16px;
  border-radius: 14px;
  background: linear-gradient(120deg, #2a1940, #3b1230);
  color: #fff;

  .vip-left {
    font-size: 14px;
    font-weight: 600;
    small {
      display: block;
      margin-top: 2px;
      font-size: 11px;
      font-weight: 400;
      color: var(--eve-muted);
    }
  }
  :deep(.van-icon) {
    color: var(--eve-muted);
  }
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
