<template>
  <section v-if="anchor" class="summary">
    <div class="card">
      <img class="avatar" :src="anchor.avatar" alt="" />
      <h1 class="duration">{{ durationText }}</h1>
      <p class="ended">{{ t("callSummary.callEnded") }}</p>

      <div class="costs">
        <div class="cost">
          <span>{{ t("callSummary.callCost") }}</span>
          <b><img src="/assets/eve/callDetail/coin_16@2x.png" alt="" />{{ callCost }}</b>
        </div>
        <div class="cost">
          <span>{{ t("callSummary.giftCost") }}</span>
          <b><img src="/assets/eve/callDetail/coin_16@2x.png" alt="" />{{ giftCost }}</b>
        </div>
      </div>

      <button class="follow" :class="{ on: followed }" @click="toggleFollow">
        {{ followed ? t("common.following") : t("callSummary.followAnchor", { name: anchor.nickname }) }}
      </button>

      <div v-if="!isVip" class="vip-upsell">
        <span>{{ t("callSummary.vipUpsell") }}</span>
        <button @click="router.push('/membership')">{{ t("callSummary.get") }}</button>
      </div>
    </div>

    <button class="confirm" @click="router.replace('/messages')">{{ t("callSummary.confirm") }}</button>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import emitter from "../common/eventBus";
import { api } from "../services/api";
import { useCall } from "../composables/useCall";
import { useUserStore } from "../stores";
import type { Anchor } from "../types/eve";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { reset } = useCall();

const id = Number(route.params.id);
const duration = Number(route.query.duration || 0);
const giftCost = Number(route.query.gift || 0);
// 通话费取通话页透传的"实际扣费"金额（与 useCall 的分钟计费一致），不再独立重算
const callCost = Number(route.query.coins || 0);

const anchor = ref<Anchor | null>(null);
const followed = ref(false);

const isVip = computed(() => userStore.isVip);

const durationText = computed(() => {
  const m = String(Math.floor(duration / 60)).padStart(2, "0");
  const s = String(duration % 60).padStart(2, "0");
  return `${m}:${s}`;
});

function toggleFollow() {
  followed.value = !followed.value;
  emitter.emit("toast", followed.value ? t("callSummary.followed") : t("callSummary.unfollowed"));
}

onMounted(async () => {
  anchor.value = await api.getAnchor(id);
  reset(); // 结算后复位通话状态
});
</script>

<style scoped lang="scss">
.summary {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 22px;
  padding: 24px;
  background: rgba(0, 0, 0, 0.9);
}

.card {
  width: 100%;
  max-width: 320px;
  padding: 28px 20px 22px;
  border-radius: 24px;
  background: linear-gradient(180deg, #4a2526 0%, #2c1a1a 100%);
  text-align: center;
}

.avatar {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid rgba(255, 84, 115, 0.6);
}

.duration {
  margin: 14px 0 2px;
  font-size: 26px;
  font-weight: 700;
  color: #fff;
}

.ended {
  font-size: 13px;
  color: #9a8b8b;
  margin-bottom: 18px;
}

.costs {
  display: flex;
  gap: 12px;
  margin-bottom: 18px;
}

.cost {
  flex: 1;
  padding: 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);

  span {
    display: block;
    font-size: 12px;
    color: #9a8b8b;
    margin-bottom: 6px;
  }
  b {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 18px;
    color: #ffd36e;
    img {
      width: 16px;
      height: 16px;
    }
  }
}

.follow {
  width: 100%;
  height: 44px;
  border-radius: 22px;
  background: linear-gradient(90deg, #ff5473, #eb6300);
  color: #fff;
  font-weight: 600;
  font-size: 14px;

  &.on {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.4);
  }
}

.vip-upsell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 14px;
  background: linear-gradient(120deg, #5a3a1a, #8a5a22);
  text-align: left;

  span {
    font-size: 12px;
    color: #ffe8c6;
  }
  button {
    flex: 0 0 auto;
    padding: 6px 18px;
    border-radius: 16px;
    background: #fff;
    color: #562b00;
    font-weight: 700;
    font-size: 13px;
  }
}

.confirm {
  width: 100%;
  max-width: 320px;
  height: 50px;
  border-radius: 25px;
  background: #eb6300;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}
</style>
