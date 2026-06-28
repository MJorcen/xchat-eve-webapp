<template>
  <section class="mine">
    <div class="hero">
      <button class="edit" @click="router.push('/edit-profile')">
        <SquarePen :size="18" :stroke-width="1.8" />
      </button>

      <div class="profile">
        <div class="avatar-ring">
          <van-image round fit="cover" class="avatar" :src="user.avatar" lazy-load />
        </div>
        <div class="profile-info">
          <div class="name-row">
            <strong class="name">{{ user.nickname }}</strong>
            <span class="sex-badge">♀</span>
          </div>
          <button class="id-row" @click="copyId">
            ID: {{ user.id }}
            <Copy :size="13" :stroke-width="1.8" />
          </button>
        </div>
      </div>

      <div class="stats">
        <button class="stat" @click="router.push('/follow-and-fans?type=following')">
          <strong>{{ user.following }}</strong><span>{{ t("mine.following") }}</span>
        </button>
        <i class="shu" />
        <button class="stat" @click="router.push('/follow-and-fans?type=followers')">
          <strong>{{ user.followers }}</strong><span>{{ t("mine.followers") }}</span>
        </button>
        <i class="shu" />
        <button class="stat" @click="router.push(`/user-dynamic-list/${user.id}`)">
          <strong>12</strong><span>{{ t("mine.moments") }}</span>
        </button>
        <i class="shu" />
        <button class="stat" @click="router.push('/visitors')">
          <strong>36</strong><span>{{ t("mine.visitor") }}</span>
        </button>
      </div>
    </div>

    <!-- VIP 横幅 -->
    <button class="vip-banner" @click="router.push('/membership')">
      <span class="vip-icon"><Crown :size="20" :stroke-width="1.8" /></span>
      <div class="vip-text">
        <strong>{{ t("mine.becomeVip") }}</strong>
        <small>{{ t("mine.vipDesc") }}</small>
      </div>
      <span class="vip-cta">{{ t("mine.go") }} ›</span>
    </button>

    <!-- 钱包卡 -->
    <button class="coin-card" @click="router.push('/wallet')">
      <span class="coin-icon"><Coins :size="22" :stroke-width="1.8" /></span>
      <div class="coin-left">
        <span>{{ t("mine.myCoins") }}</span>
        <strong>{{ user.coins }}</strong>
      </div>
      <span class="coin-cta">{{ t("common.recharge") }}</span>
    </button>

    <!-- 设置列表 -->
    <nav class="settings">
      <button class="row" @click="router.push('/game')">
        <span class="row-ico g-pink"><Gamepad2 :size="18" :stroke-width="1.8" /></span>
        <span class="label">{{ t("mine.games") }}</span>
        <ChevronRight class="arrow" :size="18" :stroke-width="1.8" />
      </button>
      <button class="row" @click="router.push('/block-list')">
        <span class="row-ico g-purple"><Ban :size="18" :stroke-width="1.8" /></span>
        <span class="label">{{ t("mine.blockList") }}</span>
        <ChevronRight class="arrow" :size="18" :stroke-width="1.8" />
      </button>
      <button class="row" @click="router.push('/feedback')">
        <span class="row-ico g-gold"><MessageSquareWarning :size="18" :stroke-width="1.8" /></span>
        <span class="label">{{ t("mine.feedback") }}</span>
        <ChevronRight class="arrow" :size="18" :stroke-width="1.8" />
      </button>
      <button class="row" @click="showLang = true">
        <span class="row-ico g-green"><Languages :size="18" :stroke-width="1.8" /></span>
        <span class="label">{{ t("mine.language") }}</span>
        <span class="lang-val">{{ t(`lang.${userStore.lang}`) }}</span>
        <ChevronRight class="arrow" :size="18" :stroke-width="1.8" />
      </button>
    </nav>

    <van-action-sheet
      v-model:show="showLang"
      :actions="langActions"
      :cancel-text="t('common.cancel')"
      close-on-click-action
      @select="onLang"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { showToast } from "vant";
import { useI18n } from "vue-i18n";
import {
  SquarePen,
  Copy,
  Crown,
  Coins,
  Gamepad2,
  Ban,
  MessageSquareWarning,
  Languages,
  ChevronRight
} from "lucide-vue-next";
import { eveMockApi } from "../services/eveMockApi";
import { useUserStore } from "../stores";
import type { AppLocale } from "../i18n";
import type { CurrentUser } from "../types/eve";

defineOptions({ name: "MinePage" });

const { t, locale } = useI18n();
const router = useRouter();
const userStore = useUserStore();
// 金币走 store（与充值/礼物/通话计费同源），其余资料字段回退到 mock
const user = computed<CurrentUser>(() => ({ ...eveMockApi.getCurrentUser(), ...userStore.user } as CurrentUser));

const showLang = ref(false);
const langActions = [
  { name: "English", value: "en" },
  { name: "中文", value: "zh" }
];

function copyId() {
  navigator.clipboard?.writeText(String(user.value.id));
  showToast(t("mine.idCopied"));
}

function onLang(a: { value: AppLocale }) {
  userStore.setLang(a.value);
  locale.value = a.value;
}
</script>

<style scoped lang="scss">
.mine {
  height: 100vh;
  overflow-y: auto;
  padding: 0 0 78px;
  background: var(--eve-bg);
}

.hero {
  position: relative;
  padding: calc(44px + env(safe-area-inset-top)) 16px 20px;
  background:
    radial-gradient(120% 80% at 0% 0%, rgba(153, 69, 255, 0.18) 0%, transparent 55%),
    radial-gradient(120% 80% at 100% 0%, rgba(255, 42, 122, 0.16) 0%, transparent 55%),
    var(--eve-bg);
}

.edit {
  position: absolute;
  top: calc(16px + env(safe-area-inset-top));
  right: 16px;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--eve-muted);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--eve-line);
}

.profile {
  display: flex;
  align-items: center;
  gap: 14px;
}

.avatar-ring {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  padding: 2.5px;
  background: conic-gradient(from 210deg, #ff2a7a, #9945ff, #ffb800, #ff2a7a);
  flex: 0 0 auto;
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  border: 2.5px solid var(--eve-bg);
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 9px;
  flex: 1;
  min-width: 0;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  .name {
    font-size: 19px;
    font-weight: 800;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sex-badge {
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    font-size: 11px;
    color: #fff;
    background: var(--eve-pink);
    flex: 0 0 auto;
  }
}

.id-row {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--eve-muted);
}

.stats {
  display: flex;
  align-items: center;
  margin-top: 22px;

  .stat {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    strong {
      font-size: 18px;
      font-weight: 800;
      color: #fff;
    }
    span {
      font-size: 11px;
      color: var(--eve-faint);
    }
  }
  .shu {
    width: 1px;
    height: 24px;
    background: var(--eve-line);
  }
}

.vip-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  width: calc(100% - 32px);
  margin: 16px;
  padding: 14px 16px;
  border-radius: 18px;
  background: linear-gradient(120deg, #2a1940 0%, #3b1230 100%);
  border: 1px solid var(--eve-line);
  text-align: left;

  .vip-icon {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 12px;
    color: #1a1020;
    background: linear-gradient(135deg, #ffd36e, #ffb800);
    flex: 0 0 auto;
  }
  .vip-text {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
    min-width: 0;
    strong {
      font-size: 15px;
      font-weight: 800;
      color: var(--eve-gold);
    }
    small {
      font-size: 11px;
      color: var(--eve-muted);
    }
  }
  .vip-cta {
    font-size: 13px;
    font-weight: 600;
    color: var(--eve-gold);
    flex: 0 0 auto;
  }
}

.coin-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: calc(100% - 32px);
  margin: 0 16px 16px;
  padding: 16px;
  border-radius: 18px;
  background: var(--eve-surface);
  border: 1px solid var(--eve-line);

  .coin-icon {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 12px;
    color: var(--eve-gold);
    background: var(--eve-track);
    border: 1px solid var(--eve-line);
    flex: 0 0 auto;
  }
  .coin-left {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    flex: 1;
    span {
      font-size: 11px;
      color: var(--eve-faint);
    }
    strong {
      font-size: 22px;
      font-weight: 800;
      color: var(--eve-gold);
    }
  }
  .coin-cta {
    padding: 8px 18px;
    border-radius: 20px;
    background: var(--eve-grad);
    box-shadow: var(--eve-glow-pink);
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    flex: 0 0 auto;
  }
}

.settings {
  margin: 0 16px;
  background: var(--eve-surface);
  border: 1px solid var(--eve-line);
  border-radius: 18px;
  overflow: hidden;

  .row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 13px 14px;
    text-align: left;

    & + .row {
      border-top: 1px solid var(--eve-line);
    }
    .row-ico {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 10px;
      flex: 0 0 auto;
      &.g-pink {
        color: var(--eve-pink);
        background: rgba(255, 42, 122, 0.12);
      }
      &.g-purple {
        color: #a98bff;
        background: rgba(153, 69, 255, 0.14);
      }
      &.g-gold {
        color: var(--eve-gold);
        background: rgba(255, 184, 0, 0.12);
      }
      &.g-green {
        color: #34d399;
        background: rgba(34, 197, 94, 0.12);
      }
    }
    .label {
      flex: 1;
      font-size: 14px;
      font-weight: 500;
      color: var(--eve-text);
    }
    .lang-val {
      flex: 0 0 auto;
      font-size: 13px;
      color: var(--eve-faint);
    }
    .arrow {
      color: var(--eve-faint);
      flex: 0 0 auto;
    }
  }
}
</style>
