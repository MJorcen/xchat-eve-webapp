<template>
  <section class="detail">
    <TopBar :title="t('walletDetail.title')" />

    <div class="list">
      <article v-for="r in records" :key="r.id" class="record">
        <div class="ic" :class="r.type">
          <img src="/assets/eve/wallet/coin_20@2x.png" alt="" />
        </div>
        <div class="body">
          <strong>{{ r.title }}</strong>
          <span>{{ r.time }}</span>
        </div>
        <b class="amount" :class="r.type">{{ r.amount > 0 ? "+" : "" }}{{ r.amount }}</b>
      </article>
    </div>

    <p v-if="!records.length" class="empty">{{ t("walletDetail.empty") }}</p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import TopBar from "../components/TopBar.vue";
import { api } from "../services/api";
import type { WalletRecord } from "../types/eve";

const { t } = useI18n();
const records = ref<WalletRecord[]>([]);

onMounted(async () => {
  records.value = await api.getWalletRecords();
});
</script>

<style scoped lang="scss">
.detail {
  min-height: 100vh;
  background: #2c1a1a;
}

.list {
  padding: 6px 16px;
}

.record {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;

  & + .record {
    border-top: 1px solid #241213;
  }

  .ic {
    flex: 0 0 auto;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    background: rgba(0, 227, 151, 0.12);
    &.expense {
      background: rgba(255, 84, 115, 0.12);
    }
    img {
      width: 22px;
      height: 22px;
    }
  }
  .body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
    strong {
      font-size: 14px;
      color: #fff;
    }
    span {
      font-size: 12px;
      color: #9a8b8b;
    }
  }
  .amount {
    font-size: 16px;
    font-weight: 700;
    &.income {
      color: #00e397;
    }
    &.expense {
      color: #ff5473;
    }
  }
}

.empty {
  margin-top: 80px;
  text-align: center;
  color: #6f5b5b;
}
</style>
