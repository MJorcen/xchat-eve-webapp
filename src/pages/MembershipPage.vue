<template>
  <section class="membership">
    <header class="nav">
      <button class="back" @click="router.back()"><van-icon name="arrow-left" /></button>
      <span class="title">Membership</span>
    </header>

    <div class="hero">
      <div class="crown">👑</div>
      <h1>EVE VIP</h1>
      <p>Unlock unlimited video chats, lower match prices & exclusive perks</p>
    </div>

    <div class="plans">
      <button
        v-for="plan in plans"
        :key="plan.id"
        class="plan"
        :class="{ active: selected?.id === plan.id }"
        @click="selected = plan"
      >
        <span v-if="plan.recommended" class="badge">Popular</span>
        <strong class="plan-name">{{ plan.name }}</strong>
        <span class="plan-months">{{ plan.months }} month{{ plan.months > 1 ? "s" : "" }}</span>
        <span class="plan-price">{{ plan.price }}</span>
      </button>
    </div>

    <ul v-if="selected" class="perks">
      <li v-for="perk in selected.perks" :key="perk">
        <van-icon name="success" /> {{ perk }}
      </li>
    </ul>

    <button class="subscribe" :disabled="!selected" @click="subscribe">
      {{ selected ? `Subscribe · ${selected.price}` : "Select a plan" }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { showToast } from "vant";
import { api } from "../services/api";
import type { VipPlan } from "../types/eve";

const router = useRouter();
const plans = ref<VipPlan[]>([]);
const selected = ref<VipPlan | null>(null);

function subscribe() {
  if (!selected.value) return;
  showToast("Mock: subscription started");
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
  background: radial-gradient(120% 50% at 50% 0%, #4a2f12 0%, #2c1a1a 55%);
}

.nav {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: calc(10px + env(safe-area-inset-top)) 14px 10px;
  .back {
    color: #fff;
    font-size: 20px;
  }
  .title {
    font-size: 16px;
    font-weight: 600;
    color: #fff;
  }
}

.hero {
  text-align: center;
  padding: 16px 24px 26px;
  .crown {
    font-size: 56px;
  }
  h1 {
    margin: 8px 0 6px;
    font-size: 24px;
    font-weight: 800;
    color: #ffd36e;
  }
  p {
    font-size: 13px;
    color: #c8b8b8;
    line-height: 1.5;
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
  background: #3a2526;
  border: 1.5px solid transparent;

  &.active {
    border-color: #ffd36e;
    background: rgba(255, 211, 110, 0.12);
  }
  .badge {
    position: absolute;
    top: -9px;
    padding: 2px 10px;
    border-radius: 99px;
    font-size: 10px;
    color: #562b00;
    background: linear-gradient(90deg, #ffe08a, #ffc24b);
  }
  .plan-name {
    font-size: 15px;
    color: #fff;
  }
  .plan-months {
    font-size: 11px;
    color: #9a8b8b;
  }
  .plan-price {
    margin-top: 4px;
    font-size: 18px;
    font-weight: 700;
    color: #ffd36e;
  }
}

.perks {
  margin: 22px 16px 0;
  padding: 16px;
  border-radius: 16px;
  background: #3a2526;
  list-style: none;

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 0;
    font-size: 13px;
    color: #ece4e4;
    :deep(.van-icon) {
      color: #ffd36e;
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
  color: #562b00;
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(90deg, #ffe08a, #ffc24b);

  &:disabled {
    opacity: 0.6;
  }
}
</style>
