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
import { getCoinRecords } from "../services/wallet";
import type { WalletRecord } from "../types/eve";

const { t } = useI18n();
const records = ref<WalletRecord[]>([]);

function fmtTime(ms?: number): string {
  if (!ms) return "";
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

onMounted(async () => {
  // txGroup 1=收入 2=支出;分别拉取后按时间合并,支出取负以便显示 "-"
  const [income, expense] = await Promise.all([getCoinRecords(1).catch(() => []), getCoinRecords(2).catch(() => [])]);
  const raw = [
    ...income.map((r) => ({ r, type: "income" as const })),
    ...expense.map((r) => ({ r, type: "expense" as const }))
  ].sort((a, b) => (b.r.createdAt ?? 0) - (a.r.createdAt ?? 0));
  records.value = raw.map(({ r, type }) => ({
    id: r.id,
    title: r.txName || "",
    time: fmtTime(r.createdAt),
    amount: type === "expense" ? -Math.abs(r.amount) : Math.abs(r.amount),
    type
  }));
});
</script>

<style scoped lang="scss">
.detail {
  min-height: 100vh;
  background: var(--eve-bg);
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
    border-top: 1px solid var(--eve-line);
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
      color: var(--eve-faint);
    }
  }
  .amount {
    font-size: 16px;
    font-weight: 700;
    &.income {
      color: var(--eve-green);
    }
    &.expense {
      color: var(--eve-pink);
    }
  }
}

.empty {
  margin-top: 80px;
  text-align: center;
  color: var(--eve-faint);
}
</style>
