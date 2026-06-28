<template>
  <section class="signin">
    <TopBar :title="t('signIn.title')">
      <button class="renew" @click="router.push('/membership')">
        <Crown :size="14" :stroke-width="2" />{{ t("signIn.renew") }}
      </button>
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

    <!-- 累计里程碑奖励 -->
    <div class="milestones">
      <div class="ms-head">
        <span class="ms-title">{{ t("signIn.milestoneTitle") }}</span>
        <span class="ms-progress">{{ t("signIn.milestoneProgress", { count: signedCount }) }}</span>
      </div>
      <div class="ms-grid">
        <div v-for="m in milestones" :key="m.days" class="ms" :class="msState(m)">
          <span class="ms-days">{{ t("signIn.milestoneDays", { n: m.days }) }}</span>
          <div class="ms-reward">
            <template v-if="m.type === 'vip'">
              <span class="ms-vip">👑</span>
              <span class="ms-amt">{{ t("signIn.vipReward", { n: m.amount }) }}</span>
            </template>
            <template v-else>
              <img class="ms-coin" src="/assets/eve/wallet/coin_20@2x.png" alt="" />
              <span class="ms-amt">+{{ m.amount }}</span>
            </template>
          </div>
          <button class="ms-btn" :disabled="msState(m) !== 'claimable'" @click="claimMilestone(m)">
            {{ msState(m) === "claimed" ? t("signIn.claimed") : t("signIn.claim") }}
          </button>
        </div>
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
import { useRouter } from "vue-router";
import { showToast } from "vant";
import { Crown } from "lucide-vue-next";
import TopBar from "../components/TopBar.vue";
import { api } from "../services/api";
import { useUserStore } from "../stores";
import type { SignDay } from "../types/eve";

const { t } = useI18n();
const router = useRouter();
const userStore = useUserStore();
const signDays = ref<SignDay[]>([]);
const showReward = ref(false);
const lastReward = ref(0);

type Milestone = { days: number; type: "coin" | "vip"; amount: number };
const milestones: Milestone[] = [
  { days: 3, type: "coin", amount: 200 },
  { days: 7, type: "coin", amount: 500 },
  { days: 15, type: "vip", amount: 3 }
];

const coins = computed(() => userStore.coins);
const signedCount = computed(() => signDays.value.filter((d) => d.signed).length);
const todayItem = computed(() => signDays.value.find((d) => d.today));
const canSign = computed(() => !!todayItem.value && !todayItem.value.signed);

function cellState(d: SignDay) {
  if (d.signed) return "claimed";
  if (d.today) return "today";
  return "locked";
}

function msState(m: Milestone) {
  if (userStore.claimedMilestones.includes(m.days)) return "claimed";
  return signedCount.value >= m.days ? "claimable" : "locked";
}

function handleSign() {
  const item = todayItem.value;
  if (!item || item.signed) return;
  userStore.addCoins(item.reward);
  userStore.claimSignDay(item.day);
  item.signed = true;
  item.today = false;
  lastReward.value = item.reward;
  showReward.value = true;
}

function claimMilestone(m: Milestone) {
  if (msState(m) !== "claimable") return;
  if (m.type === "vip") {
    const end = new Date(Date.now() + m.amount * 86400000).toISOString().slice(0, 10);
    userStore.setUser({ vipLevel: Math.max(1, userStore.user.vipLevel ?? 0), vipValidEnd: end });
    showToast(t("signIn.vipReward", { n: m.amount }));
  } else {
    userStore.addCoins(m.amount);
    lastReward.value = m.amount;
    showReward.value = true;
  }
  userStore.claimMilestone(m.days);
}

onMounted(async () => {
  const claimed = new Set(userStore.claimedSignDays);
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
  background: var(--eve-bg);
}

.renew {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #1a1020;
  background: linear-gradient(135deg, #ffd36e, #ffb800);
}

.rules {
  padding: 8px 32px 16px;
  text-align: center;
  font-size: 12px;
  color: var(--eve-faint);
}

.calendar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: 0 16px;
  padding: 16px;
  border-radius: 16px;
  background: var(--eve-surface);
  border: 1px solid var(--eve-line);
}

.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 4px;
  border-radius: 12px;
  background: var(--eve-track);
  position: relative;

  .day {
    font-size: 11px;
    color: var(--eve-faint);
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
    color: var(--eve-green);
  }

  &.claimed {
    background: rgba(34, 197, 94, 0.08);
    .reward {
      color: var(--eve-faint);
    }
    .coin {
      opacity: 0.55;
    }
  }
  &.today {
    background: linear-gradient(135deg, rgba(255, 42, 122, 0.25), rgba(153, 69, 255, 0.25));
    border: 1.5px solid var(--eve-pink);
    box-shadow: var(--eve-glow-pink);
    .day {
      color: #fff;
    }
    .reward {
      color: var(--eve-gold);
    }
  }
  &.locked {
    .coin {
      opacity: 0.5;
    }
    .reward {
      color: var(--eve-faint);
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
  background: var(--eve-grad);
  box-shadow: var(--eve-glow-pink);

  &:disabled {
    background: var(--eve-surface);
    color: var(--eve-faint);
    box-shadow: none;
  }
}

.milestones {
  margin: 0 16px 24px;
  padding: 16px;
  border-radius: 16px;
  background: var(--eve-surface);
  border: 1px solid var(--eve-line);

  .ms-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 14px;
    .ms-title {
      font-size: 14px;
      font-weight: 800;
      color: #fff;
    }
    .ms-progress {
      font-size: 12px;
      color: var(--eve-faint);
    }
  }
  .ms-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
  .ms {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 14px 6px;
    border-radius: 14px;
    background: var(--eve-track);
    border: 1px solid var(--eve-line);

    &.claimable {
      border-color: var(--eve-pink);
      background: rgba(255, 42, 122, 0.08);
    }
    &.locked {
      opacity: 0.65;
    }
  }
  .ms-days {
    font-size: 12px;
    font-weight: 700;
    color: #fff;
  }
  .ms-reward {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    .ms-coin {
      width: 28px;
      height: 28px;
    }
    .ms-vip {
      font-size: 26px;
    }
    .ms-amt {
      font-size: 12px;
      font-weight: 700;
      color: var(--eve-gold);
    }
  }
  .ms-btn {
    width: 100%;
    padding: 6px 0;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    color: #fff;
    background: var(--eve-grad);
    &:disabled {
      background: var(--eve-line);
      color: var(--eve-faint);
    }
  }
}

.reward-card {
  width: 280px;
  padding: 28px 24px 22px;
  background: linear-gradient(180deg, #1d142b, #0b0712);
  border: 1px solid var(--eve-line);
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
    color: var(--eve-gold);
  }
  h3 {
    font-size: 17px;
    color: #fff;
  }
  p {
    margin-top: 6px;
    font-size: 13px;
    color: var(--eve-faint);
  }
  .ok {
    width: 100%;
    margin-top: 20px;
    padding: 13px;
    border-radius: 16px;
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    background: var(--eve-grad);
  }
}
</style>
