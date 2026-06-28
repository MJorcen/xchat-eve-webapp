<template>
  <section class="membership">
    <header class="nav">
      <button class="back" @click="router.back()"><ChevronLeft :size="24" :stroke-width="2.2" /></button>
      <span class="title">{{ t("membership.title") }}</span>
    </header>

    <div class="hero">
      <div class="crown">👑</div>
      <h1>EVE VIP</h1>
      <p>{{ t("membership.heroSubtitle") }}</p>
    </div>

    <!-- VIP 权益轮播 -->
    <van-swipe class="benefits" :autoplay="2800" :show-indicators="true" indicator-color="#ff2a7a">
      <van-swipe-item v-for="b in benefits" :key="b.text">
        <div class="benefit">
          <span class="b-ico">{{ b.icon }}</span>
          <span class="b-text">{{ b.text }}</span>
        </div>
      </van-swipe-item>
    </van-swipe>

    <div class="plans">
      <button
        v-for="plan in plans"
        :key="plan.id"
        class="plan"
        :class="{ active: selected?.id === plan.id }"
        @click="selected = plan"
      >
        <span v-if="plan.recommended" class="badge">{{ t("membership.popular") }}</span>
        <strong class="plan-name">{{ plan.name }}</strong>
        <span class="plan-months">{{ plan.months }} {{ plan.months > 1 ? t("membership.months") : t("membership.month") }}</span>
        <span class="plan-price">{{ plan.price }}</span>
      </button>
    </div>

    <ul v-if="selected" class="perks">
      <li v-for="perk in selected.perks" :key="perk">
        <Check :size="16" :stroke-width="2.4" /> {{ perk }}
      </li>
    </ul>

    <button class="subscribe" :disabled="!selected" @click="subscribe">
      {{ selected ? `${t("membership.subscribe")} · ${selected.price}` : t("membership.selectPlan") }}
    </button>

    <PaymentSheet
      v-model:show="showSheet"
      :title="t('membership.subscribe')"
      :amount="selected?.price || ''"
      @pay="onPay"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { showToast } from "vant";
import { ChevronLeft, Check } from "lucide-vue-next";
import PaymentSheet from "../components/PaymentSheet.vue";
import { api } from "../services/api";
import { useUserStore } from "../stores";
import type { PaymentChannel, VipPlan } from "../types/eve";

const { t } = useI18n();
const router = useRouter();
const userStore = useUserStore();
const plans = ref<VipPlan[]>([]);
const selected = ref<VipPlan | null>(null);
const showSheet = ref(false);

const benefits = computed(() => [
  { icon: "💬", text: t("membership.featChat") },
  { icon: "🪙", text: t("membership.featCoins") },
  { icon: "👑", text: t("membership.featBadge") },
  { icon: "👀", text: t("membership.featVisitors") },
  { icon: "🎁", text: t("membership.featGifts") }
]);

function subscribe() {
  if (selected.value) showSheet.value = true;
}

function onPay(_channel: PaymentChannel) {
  if (!selected.value) return;
  const months = selected.value.months;
  const end = new Date(Date.now() + months * 30 * 86400000).toISOString().slice(0, 10);
  userStore.setUser({ vipLevel: selected.value.level, vipValidEnd: end });
  showSheet.value = false;
  showToast(t("membership.subscribed"));
}

onMounted(async () => {
  plans.value = await api.getVipPlans();
  selected.value = plans.value.find((p) => p.recommended) || plans.value[0] || null;
});
</script>

<style scoped lang="scss">
.membership {
  min-height: 100vh;
  padding-bottom: 100px;
  background:
    radial-gradient(120% 50% at 50% 0%, rgba(255, 184, 0, 0.14) 0%, transparent 55%),
    var(--eve-bg);
}

.nav {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: calc(10px + env(safe-area-inset-top)) 14px 10px;
  .back {
    color: #fff;
  }
  .title {
    font-size: 16px;
    font-weight: 700;
    color: #fff;
  }
}

.hero {
  text-align: center;
  padding: 12px 24px 18px;
  .crown {
    font-size: 52px;
  }
  h1 {
    margin: 8px 0 6px;
    font-size: 24px;
    font-weight: 800;
    color: var(--eve-gold);
  }
  p {
    font-size: 13px;
    color: var(--eve-muted);
    line-height: 1.5;
  }
}

.benefits {
  margin: 6px 16px 20px;
  height: 76px;
  border-radius: 16px;
  background: linear-gradient(120deg, #2a1940, #1d142b);
  border: 1px solid var(--eve-line);
  :deep(.van-swipe__indicators) {
    bottom: 8px;
  }
}
.benefit {
  height: 76px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  .b-ico {
    font-size: 30px;
  }
  .b-text {
    font-size: 15px;
    font-weight: 700;
    color: var(--eve-gold);
  }
}

.plans {
  display: flex;
  gap: 10px;
  padding: 0 16px;
}

.plan {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 18px 6px 16px;
  border-radius: 16px;
  background: var(--eve-surface);
  border: 1.5px solid var(--eve-line);

  &.active {
    border-color: var(--eve-gold);
    background: rgba(255, 184, 0, 0.1);
  }
  .badge {
    position: absolute;
    top: -9px;
    padding: 2px 10px;
    border-radius: 99px;
    font-size: 10px;
    color: #1a1020;
    background: linear-gradient(90deg, #ffe08a, #ffc24b);
  }
  .plan-name {
    font-size: 15px;
    font-weight: 700;
    color: #fff;
  }
  .plan-months {
    font-size: 11px;
    color: var(--eve-faint);
  }
  .plan-price {
    margin-top: 4px;
    font-size: 18px;
    font-weight: 800;
    color: var(--eve-gold);
  }
}

.perks {
  margin: 22px 16px 0;
  padding: 16px;
  border-radius: 16px;
  background: var(--eve-surface);
  border: 1px solid var(--eve-line);
  list-style: none;

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 0;
    font-size: 13px;
    color: var(--eve-text);
    color: #ece4e4;
    svg {
      color: var(--eve-gold);
      flex: 0 0 auto;
    }
  }
}

.subscribe {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;
  width: min(400PX, 100vw);
  padding: 14px 16px calc(14px + env(safe-area-inset-bottom));
  color: #1a1020;
  font-size: 16px;
  font-weight: 800;
  background: linear-gradient(90deg, #ffe08a, #ffc24b);

  &:disabled {
    opacity: 0.6;
  }
}
</style>
