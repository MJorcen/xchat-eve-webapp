<template>
  <section class="signin">
    <TopBar :title="t('signIn.title')">
      <span class="streak">{{ signedCount }}/7</span>
    </TopBar>

    <p class="rules">{{ t("signIn.rules") }}</p>

    <!-- 7 天奖励日历 -->
    <div class="calendar">
      <div v-for="d in signDays" :key="d.day" class="cell" :class="cellState(d)">
        <span class="day">{{ t("signIn.day", { day: d.day }) }}</span>
        <img class="coin" src="/assets/eve/wallet/coin_20@2x.png" alt="" />
        <span class="reward">+{{ d.reward }}</span>
        <span v-if="d.signed" class="check">✓</span>
      </div>
    </div>

    <button class="sign-btn" :disabled="!canSign" @click="handleSign">
      {{ canSign ? t("signIn.signInReward", { reward: todayItem?.reward }) : t("signIn.signedToday") }}
    </button>

    <!-- 累计进度 -->
    <div class="progress-panel">
      <div class="progress-head">
        <span class="pt">{{ t("signIn.streakLabel") }}</span>
        <span class="pc">{{ t("signIn.daysCount", { count: signedCount }) }}</span>
      </div>
      <div class="rail">
        <i v-for="d in signDays" :key="d.day" :class="{ on: d.signed }" />
      </div>
    </div>

    <!-- 领取奖励弹窗 -->
    <van-popup
      v-model:show="showReward"
      round
      position="center"
      teleport="body"
      :overlay-style="{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(8px)' }"
    >
      <div class="reward-card">
        <div class="burst">🎉</div>
        <strong class="amount">+{{ lastReward }}</strong>
        <h3>{{ t("signIn.rewardClaimed") }}</h3>
        <p>{{ t("signIn.balance", { coins }) }}</p>
        <button class="ok" @click="showReward = false">{{ t("signIn.awesome") }}</button>
      </div>
    </van-popup>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import TopBar from "../components/TopBar.vue";
import { api } from "../services/api";
import { useUserStore } from "../stores";
import type { SignDay } from "../types/eve";

const { t } = useI18n();
const userStore = useUserStore();
const signDays = ref<SignDay[]>([]);
const showReward = ref(false);
const lastReward = ref(0);

const coins = computed(() => userStore.coins);
const signedCount = computed(() => signDays.value.filter((d) => d.signed).length);
const todayItem = computed(() => signDays.value.find((d) => d.today));
const canSign = computed(() => !!todayItem.value && !todayItem.value.signed);

function cellState(d: SignDay) {
  if (d.signed) return "claimed";
  if (d.today) return "today";
  return "locked";
}

function handleSign() {
  const item = todayItem.value;
  if (!item || item.signed) return;
  userStore.addCoins(item.reward);
  userStore.claimSignDay(item.day); // 持久化记录，重进不可重复领取
  item.signed = true;
  item.today = false;
  lastReward.value = item.reward;
  showReward.value = true;
}

onMounted(async () => {
  const claimed = new Set(userStore.claimedSignDays);
  // 用已持久化的领取记录回填签到状态：已领的标记为 signed 且不再是 today
  signDays.value = (await api.getSignDays()).map((d) => ({
    ...d,
    signed: d.signed || claimed.has(d.day),
    today: !!d.today && !claimed.has(d.day)
  }));
});
</script>

<style scoped lang="scss">
.signin {
  min-height: 100vh;
  background: #2c1a1a;
}

.streak {
  font-size: 13px;
  color: #ffd36e;
}

.rules {
  padding: 8px 32px 16px;
  text-align: center;
  font-size: 12px;
  color: #9a8b8b;
}

.calendar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: 0 16px;
  padding: 16px;
  border-radius: 16px;
  background: #3a2526;
}

.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 4px;
  border-radius: 12px;
  background: #241213;
  position: relative;

  .day {
    font-size: 11px;
    color: #9a8b8b;
  }
  .coin {
    width: 26px;
    height: 26px;
  }
  .reward {
    font-size: 13px;
    font-weight: 700;
    color: #fff;
  }
  .check {
    position: absolute;
    top: 5px;
    right: 7px;
    font-size: 11px;
    color: #00e397;
  }

  &.claimed {
    background: rgba(0, 227, 151, 0.08);
    .reward {
      color: #9a8b8b;
    }
    .coin {
      opacity: 0.55;
    }
  }
  &.today {
    background: linear-gradient(135deg, rgba(255, 84, 115, 0.25), rgba(235, 99, 0, 0.25));
    border: 1.5px solid #eb6300;
    box-shadow: 0 0 12px rgba(235, 99, 0, 0.5);
    .day {
      color: #fff;
    }
    .reward {
      color: #ffd36e;
    }
  }
  &.locked {
    .coin {
      opacity: 0.5;
    }
    .reward {
      color: #9a8b8b;
    }
  }
}

.sign-btn {
  display: block;
  width: calc(100% - 64px);
  margin: 24px 32px;
  padding: 15px;
  border-radius: 16px;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(90deg, #ff5473, #eb6300);
  box-shadow: 0 8px 20px rgba(235, 99, 0, 0.35);

  &:disabled {
    background: #3a2526;
    color: #9a8b8b;
    box-shadow: none;
  }
}

.progress-panel {
  margin: 0 16px;
  padding: 16px;
  border-radius: 16px;
  background: #3a2526;

  .progress-head {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
    .pt {
      font-size: 14px;
      font-weight: 600;
      color: #eb6300;
    }
    .pc {
      font-size: 13px;
      color: #fff;
    }
  }
  .rail {
    display: flex;
    gap: 6px;
    i {
      flex: 1;
      height: 6px;
      border-radius: 99px;
      background: #241213;
      &.on {
        background: linear-gradient(90deg, #ff5473, #eb6300);
      }
    }
  }
}

.reward-card {
  width: 280px;
  padding: 28px 24px 22px;
  background: #3a2526;
  border-radius: 24px;
  text-align: center;

  .burst {
    font-size: 48px;
  }
  .amount {
    display: block;
    margin: 8px 0;
    font-size: 40px;
    font-weight: 800;
    color: #ffd36e;
  }
  h3 {
    font-size: 17px;
    color: #fff;
  }
  p {
    margin-top: 6px;
    font-size: 13px;
    color: #9a8b8b;
  }
  .ok {
    width: 100%;
    margin-top: 20px;
    padding: 13px;
    border-radius: 16px;
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    background: linear-gradient(90deg, #ff5473, #eb6300);
  }
}
</style>
