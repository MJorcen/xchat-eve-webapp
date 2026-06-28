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

    <!-- 视频通话按钮（右下角） -->
    <button class="call-btn" @click.stop="openCall(anchor)">
      <Video :size="18" :stroke-width="2" />
    </button>
  </article>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { Video } from "lucide-vue-next";
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
  border-radius: 16px;
  overflow: hidden;
  background: var(--eve-surface);
  border: 1px solid var(--eve-line);
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
  background: linear-gradient(135deg, #1d142b, #0b0712);
}

.status-pill {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  align-items: center;
  gap: 5px;
  height: 21px;
  padding: 0 8px;
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  border-radius: 20px;
}

.status-pill .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #8a8594;
}

.status-pill .dot.on {
  background: var(--eve-green);
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.8);
}

.card-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 24px 10px 10px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.75) 100%);
}

.name {
  font-size: 14px;
  font-weight: 800;
  color: #fff;
  letter-spacing: 0.2px;
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
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: var(--eve-pink);
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
  bottom: 46px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: #fff;
  background: var(--eve-grad);
  box-shadow: var(--eve-glow-pink);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
