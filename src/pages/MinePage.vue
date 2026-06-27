<template>
  <section class="mine">
    <div class="hero">
      <button class="edit" @click="router.push('/edit-profile')">
        <img src="/assets/eve/mine/ic_edit-data@2x%20(2).png" alt="" />
      </button>

      <div class="profile">
        <van-image round fit="cover" class="avatar" :src="user.avatar" lazy-load />
        <div class="profile-info">
          <div class="name-row">
            <strong class="name">{{ user.nickname }}</strong>
            <img class="sex" src="/assets/eve/mine/sex.png" alt="" />
          </div>
          <button class="id-row" @click="copyId">
            ID: {{ user.id }}
            <img src="/assets/eve/mine/ic_copy@2x.png" alt="" />
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
      <div class="vip-text">
        <strong class="gold">{{ t("mine.becomeVip") }}</strong>
        <small>{{ t("mine.vipDesc") }}</small>
      </div>
      <span class="vip-cta">{{ t("mine.go") }} ›</span>
    </button>

    <!-- 钱包卡 -->
    <button class="coin-card" @click="router.push('/wallet')">
      <div class="coin-left">
        <span>{{ t("mine.myCoins") }}</span>
        <strong>{{ user.coins }}</strong>
      </div>
      <span class="coin-cta">{{ t("common.recharge") }}</span>
    </button>

    <!-- 设置列表 -->
    <nav class="settings">
      <button class="row" @click="router.push('/game')">
        <img src="/assets/eve/gc.png" alt="" />
        <span>{{ t("mine.games") }}</span>
        <img class="arrow" src="/assets/eve/mine/list_arrow-right-gray-20@2x.png" alt="" />
      </button>
      <button class="row" @click="router.push('/block-list')">
        <img src="/assets/eve/mine/ic_block%20List@2x.png" alt="" />
        <span>{{ t("mine.blockList") }}</span>
        <img class="arrow" src="/assets/eve/mine/list_arrow-right-gray-20@2x.png" alt="" />
      </button>
      <button class="row" @click="router.push('/feedback')">
        <img src="/assets/eve/mine/ic_feedback@2x.png" alt="" />
        <span>{{ t("mine.feedback") }}</span>
        <img class="arrow" src="/assets/eve/mine/list_arrow-right-gray-20@2x.png" alt="" />
      </button>
      <button class="row" @click="showLang = true">
        <img src="/assets/eve/mine/ic_settings@2x.png" alt="" />
        <span>{{ t("mine.language") }}</span>
        <span class="lang-val">{{ t(`lang.${userStore.lang}`) }}</span>
        <img class="arrow" src="/assets/eve/mine/list_arrow-right-gray-20@2x.png" alt="" />
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
  padding: 0 0 84px;
  background: #2c1a1a;
}

.hero {
  position: relative;
  padding: 50px 16px 18px;
  background: linear-gradient(180deg, #4a2526 0%, #2c1a1a 100%);
}

.edit {
  position: absolute;
  top: 16px;
  right: 16px;
  img {
    width: 26px;
    height: 26px;
  }
}

.profile {
  display: flex;
  align-items: center;
  gap: 14px;
}

.avatar {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  .name {
    font-size: 19px;
    font-weight: 700;
    color: #fff;
  }
  .sex {
    height: 18px;
  }
}

.id-row {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #c8bcbc;
  img {
    width: 14px;
    height: 14px;
  }
}

.stats {
  display: flex;
  align-items: center;
  margin-top: 20px;

  .stat {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    strong {
      font-size: 17px;
      color: #fff;
    }
    span {
      font-size: 11px;
      color: #b0a0a0;
    }
  }
  .shu {
    width: 1px;
    height: 24px;
    background: rgba(255, 255, 255, 0.12);
  }
}

.vip-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: calc(100% - 32px);
  margin: 16px;
  padding: 14px 16px;
  border-radius: 16px;
  background: linear-gradient(120deg, #5a3a1a 0%, #8a5a22 100%);
  text-align: left;

  .vip-text {
    display: flex;
    flex-direction: column;
    gap: 3px;
    strong {
      font-size: 16px;
      color: #fff;
    }
    small {
      font-size: 12px;
      color: #e8d6b8;
    }
  }
  .gold {
    color: #ffec93;
  }
  .vip-cta {
    font-size: 13px;
    color: #ffec93;
  }
}

.coin-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: calc(100% - 32px);
  margin: 0 16px 16px;
  padding: 16px;
  border-radius: 16px;
  background: linear-gradient(120deg, #3a2526 0%, #4a2e30 100%);

  .coin-left {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    span {
      font-size: 12px;
      color: #b0a0a0;
    }
    strong {
      font-size: 22px;
      color: #ffd36e;
    }
  }
  .coin-cta {
    padding: 7px 18px;
    border-radius: 20px;
    background: linear-gradient(135deg, #ff5473, #eb6300);
    color: #fff;
    font-size: 13px;
    font-weight: 600;
  }
}

.settings {
  margin: 0 16px;
  background: #3a2526;
  border-radius: 16px;
  overflow: hidden;

  .row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 15px 14px;
    text-align: left;

    & + .row {
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }
    & > img:first-child {
      width: 22px;
      height: 22px;
    }
    span {
      flex: 1;
      font-size: 14px;
      color: #ece4e4;
    }
    .lang-val {
      flex: 0 0 auto;
      font-size: 13px;
      color: #9a8b8b;
    }
    .arrow {
      width: 16px;
      height: 16px;
      opacity: 0.6;
    }
  }
}
</style>
