<template>
  <article class="host-card" @click="router.push(`/anchor/${anchor.id}`)">
    <van-image fit="cover" class="host-photo" :src="anchor.avatar" lazy-load>
      <template #loading>
        <div class="ph-skeleton" />
      </template>
      <template #error>
        <div class="ph-skeleton" />
      </template>
    </van-image>

    <!-- 在线状态（左上角） -->
    <div class="status-pill">
      <span class="dot" :class="{ on: anchor.online }" />
      {{ anchor.online ? t("common.online") : t("common.offline") }}
    </div>

    <!-- 底部渐变 + 信息 -->
    <div class="card-bottom">
      <strong class="name">{{ anchor.nickname }}</strong>
      <div class="meta-row">
        <span class="age-pill"><span class="sex">♀</span>{{ anchor.age }}</span>
        <img class="flag" :src="countryFlag(anchor.region)" alt="" />
      </div>
    </div>

    <!-- 通话按钮（右下角） -->
    <button class="call-btn" @click.stop="openCall(anchor)">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff">
        <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.7 21 3 13.3 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.4 0 .8-.2 1l-2.3 2.3z" />
      </svg>
    </button>
  </article>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useCall } from "../composables/useCall";
import type { Anchor } from "../types/eve";
import { countryFlag } from "../utils/assets";

defineProps<{ anchor: Anchor }>();

const { t } = useI18n();
const router = useRouter();
const { openCall } = useCall();
</script>

<style scoped lang="scss">
.host-card {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 12px;
  overflow: hidden;
  background: #3a2526;
  cursor: pointer;
}

.host-photo {
  width: 100%;
  height: 100%;
  display: block;
}

.ph-skeleton {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #4a3132, #2c1a1a);
}

.status-pill {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  align-items: center;
  gap: 5px;
  height: 22px;
  padding: 0 9px;
  font-size: 11px;
  color: #fff;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 20px;
}

.status-pill .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #c7c4cc;
}

.status-pill .dot.on {
  background: #00e397;
}

.card-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 22px 10px 9px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.65) 100%);
}

.name {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 5px;
}

.age-pill {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 18px;
  padding: 0 7px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: #ff5473;
  border-radius: 20px;
}

.flag {
  width: 20px;
  height: 14px;
  border-radius: 3px;
  object-fit: cover;
}

.call-btn {
  position: absolute;
  right: 9px;
  bottom: 44px;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #f9577e;
  box-shadow: 0 4px 12px rgba(249, 87, 126, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
