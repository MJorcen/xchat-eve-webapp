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

    <!-- 在线状态(左上角):Live / Online / Busy / Offline -->
    <div class="status-pill" :class="status">
      <span class="dot" />
      {{ statusText }}
    </div>

    <!-- 底部渐变 + 信息 -->
    <div class="card-bottom">
      <!-- 距离胶囊(参考 disBox,独占一行,位于名字上方,不与名字争行宽) -->
      <span v-if="anchor.distance != null" class="dist-pill">
        <MapPin :size="10" :stroke-width="2.2" />{{ anchor.distance.toFixed(1) }}km
      </span>
      <strong class="name">{{ anchor.nickname }}</strong>
      <div class="meta-row">
        <img class="flag" :src="countryFlag(anchor.region)" alt="" />
        <span class="region">{{ anchor.region.toUpperCase() }}·{{ anchor.age }}</span>
      </div>
    </div>

    <!-- 可呼叫 → 视频按钮;忙/离线 → 私信按钮 -->
    <button v-if="callable" class="fab call" @click.stop="openCall(anchor)">
      <Video :size="18" :stroke-width="2" />
    </button>
    <button v-else class="fab chat" @click.stop="router.push(`/chat/${anchor.id}`)">
      <MessageCircle :size="18" :stroke-width="2" />
    </button>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { Video, MessageCircle, MapPin } from "lucide-vue-next";
import { useCall } from "../composables/useCall";
import type { Anchor } from "../types/eve";
import { countryFlag } from "../utils/assets";

const props = defineProps<{ anchor: Anchor }>();

const { t } = useI18n();
const router = useRouter();
const { openCall } = useCall();

const status = computed(() => {
  const a = props.anchor;
  if (a.live) return "live";
  if (a.inCall) return "busy";
  if (a.online && a.onDuty) return "online";
  return "offline";
});

const statusText = computed(() => t(`common.${status.value}`));

// 在线在岗且不在通话中 → 可直接视频呼叫
const callable = computed(() => props.anchor.online && props.anchor.onDuty && !props.anchor.inCall);
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

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #8a8594;
  }
  &.online .dot {
    background: var(--eve-green);
    box-shadow: 0 0 6px rgba(34, 197, 94, 0.8);
  }
  &.busy .dot {
    background: var(--eve-gold);
  }
  &.live {
    background: var(--eve-grad);
    .dot {
      background: #fff;
      animation: blink 1.2s ease-in-out infinite;
    }
  }
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

.card-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 22px 52PX 9px 10px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.78) 100%);
}

.dist-pill {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-bottom: 7px;
  padding: 2px 8px 2px 6px;
  font-size: 10px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
  background: rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(4px);
  border-radius: 999px;
}

.name {
  display: block;
  font-size: 14px;
  font-weight: 800;
  color: #fff;
  letter-spacing: 0.2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 5px;
  min-width: 0;
}

.flag {
  width: 16px;
  height: 11px;
  border-radius: 3px;
  object-fit: cover;
  flex: 0 0 auto;
}

.region {
  font-size: 10px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fab {
  position: absolute;
  right: 8PX;
  bottom: 9PX;
  width: 40PX;
  height: 40PX;
  border-radius: 50%;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;

  &.call {
    background: var(--eve-grad);
    box-shadow: var(--eve-glow-pink);
  }
  &.chat {
    background: rgba(0, 0, 0, 0.45);
    border: 1px solid rgba(255, 255, 255, 0.35);
    backdrop-filter: blur(4px);
  }
}
</style>
