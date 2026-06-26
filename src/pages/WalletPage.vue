<template>
  <section class="wallet">
    <TopBar title="Wallet">
      <button class="records" @click="router.push('/wallet-detail')">Records</button>
    </TopBar>

    <!-- 余额卡 -->
    <div class="balance">
      <span class="label">My coins</span>
      <div class="amount">
        <img src="/assets/eve/wallet/coin_20@2x.png" alt="" />
        <strong>{{ coins }}</strong>
      </div>
      <p class="tip">Coins are used for video calls, gifts and live interactions.</p>
    </div>

    <!-- 充值套餐 -->
    <div class="section-head">
      <h2>Recharge</h2>
      <span>Secure · instant arrival</span>
    </div>
    <div class="packages">
      <button
        v-for="item in packages"
        :key="item.id"
        class="pkg"
        :class="{ active: selected === item.id }"
        @click="selected = item.id"
      >
        <span v-if="item.selected" class="tag">Popular</span>
        <div class="pkg-coins">
          <img src="/assets/eve/wallet/coin_20@2x.png" alt="" />
          <strong>{{ item.coins }}</strong>
        </div>
        <span class="pkg-bonus">+{{ item.bonus }} bonus</span>
        <span class="pkg-price">{{ item.price }}</span>
      </button>
    </div>

    <!-- VIP 入口 -->
    <button class="vip-entry" @click="router.push('/membership')">
      <span class="vip-left">👑 Become VIP <small>Unlock perks & lower prices</small></span>
      <van-icon name="arrow" />
    </button>

    <button class="continue" @click="goPay">Continue</button>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import TopBar from "../components/TopBar.vue";
import { api } from "../services/api";
import { useUserStore } from "../stores";
import type { WalletPackage } from "../types/eve";

const router = useRouter();
const userStore = useUserStore();
const packages = ref<WalletPackage[]>([]);
const selected = ref<number>(0);

const coins = computed(() => userStore.coins);

function goPay() {
  router.push({ path: "/payment", query: { packageId: selected.value } });
}

onMounted(async () => {
  packages.value = await api.getWalletPackages();
  selected.value = packages.value.find((p) => p.selected)?.id || packages.value[0]?.id || 0;
});
</script>

<style scoped lang="scss">
.wallet {
  min-height: 100vh;
  padding-bottom: 96px;
  background: #2c1a1a;
}

.records {
  font-size: 13px;
  color: #ffd36e;
}

.balance {
  margin: 8px 16px 0;
  padding: 22px 18px;
  border-radius: 18px;
  background: linear-gradient(135deg, #5a3a1a 0%, #3a2526 100%);

  .label {
    font-size: 13px;
    color: #e8d6b8;
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
      color: #ffd36e;
    }
  }
  .tip {
    font-size: 12px;
    color: #c8b8b8;
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
    color: #9a8b8b;
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
  background: #3a2526;
  border: 1.5px solid transparent;

  &.active {
    border-color: #eb6300;
    background: rgba(235, 99, 0, 0.1);
  }
  .tag {
    position: absolute;
    top: -8px;
    right: 10px;
    padding: 2px 9px;
    border-radius: 99px;
    font-size: 10px;
    color: #fff;
    background: linear-gradient(90deg, #ff5473, #eb6300);
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
    color: #ffd36e;
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
  background: linear-gradient(120deg, #5a3a1a, #8a5a22);
  color: #fff;

  .vip-left {
    font-size: 14px;
    font-weight: 600;
    small {
      display: block;
      margin-top: 2px;
      font-size: 11px;
      font-weight: 400;
      color: #ffe8c6;
    }
  }
  :deep(.van-icon) {
    color: #ffe8c6;
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
  background: linear-gradient(90deg, #ff5473, #eb6300);
}
</style>
