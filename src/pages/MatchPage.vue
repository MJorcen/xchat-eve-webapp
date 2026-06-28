<template>
  <section class="match">
    <header class="head">
      <h1>{{ t("match.title") }}</h1>
      <p>{{ t("match.subtitle") }}</p>
    </header>

    <!-- 雷达区 -->
    <div class="radar-wrap">
      <div class="radar">
        <span class="glow" />
        <span class="sweep" />
        <span class="ring r1" />
        <span class="ring r2" />
        <span class="ring r3" />

        <!-- 漂浮的主播头像 -->
        <div v-for="(a, i) in floats" :key="a.id" class="float" :class="`f${i}`">
          <van-image round fit="cover" class="float-img" :src="a.avatar" lazy-load />
          <span v-if="a.online" class="float-dot" />
        </div>

        <div class="center">
          <div class="center-ring">
            <van-image round fit="cover" class="me" :src="user?.avatar" lazy-load />
          </div>
        </div>
      </div>
    </div>

    <!-- 匹配按钮 -->
    <div class="actions">
      <button class="match-btn random" @click="startMatch('Random')">
        <span class="ico"><Shuffle :size="20" :stroke-width="2.2" /></span>
        <span class="t">{{ t("match.random") }}</span>
        <small class="c">300 <img src="/assets/eve/matchHome/coin_20@2x.png" alt="" /> {{ t("match.perMatch") }}</small>
      </button>
      <button class="match-btn goddess" @click="startMatch('Goddess')">
        <span class="ico"><Crown :size="20" :stroke-width="2.2" /></span>
        <span class="t">{{ t("match.goddess") }}</span>
        <small class="c">500 <img src="/assets/eve/matchHome/coin_20@2x.png" alt="" /> {{ t("match.perMatch") }}</small>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Shuffle, Crown } from "lucide-vue-next";
import { api } from "../services/api";
import type { Anchor, CurrentUser } from "../types/eve";

defineOptions({ name: "MatchPage" });

const { t } = useI18n();
const router = useRouter();
const user = ref<CurrentUser | null>(null);
const floats = ref<Anchor[]>([]);

onMounted(async () => {
  user.value = await api.getCurrentUser();
  floats.value = (await api.getAnchors()).slice(0, 6);
});

function startMatch(type: string) {
  // 直接进入出人卡片选(跳过「开始匹配」确认页)
  router.push({ name: "MatchDetail", query: { type } });
}
</script>

<style scoped lang="scss">
.match {
  height: 100vh;
  padding: calc(28px + env(safe-area-inset-top)) 16px calc(80px + env(safe-area-inset-bottom));
  background:
    radial-gradient(110% 60% at 50% 6%, rgba(255, 42, 122, 0.16) 0%, transparent 52%),
    radial-gradient(120% 70% at 50% 0%, rgba(153, 69, 255, 0.14) 0%, transparent 60%),
    var(--eve-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
}

.head {
  flex: 0 0 auto;
  text-align: center;
  h1 {
    font-size: 27px;
    font-weight: 800;
    color: #fff;
    letter-spacing: 0.3px;
  }
  p {
    margin-top: 7px;
    font-size: 13px;
    color: var(--eve-muted);
  }
}

.radar-wrap {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: grid;
  place-items: center;
}

/* 尺寸全部用百分比（相对 shell 约束的容器），避免 rem 放大导致溢出裁切 */
.radar {
  position: relative;
  width: 86%;
  max-width: 340PX;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
}

.glow {
  position: absolute;
  width: 72%;
  height: 72%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 42, 122, 0.28) 0%, rgba(153, 69, 255, 0.1) 45%, transparent 72%);
}

/* 旋转扫描光束 */
.sweep {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: conic-gradient(from 0deg, transparent 0deg, rgba(255, 42, 122, 0.22) 38deg, transparent 78deg);
  animation: sweep 4.5s linear infinite;
}
@keyframes sweep {
  to {
    transform: rotate(360deg);
  }
}

.ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255, 42, 122, 0.32);
  animation: pulse 2.6s ease-out infinite;
}
.r1 {
  width: 52%;
  height: 52%;
}
.r2 {
  width: 75%;
  height: 75%;
  animation-delay: 0.7s;
}
.r3 {
  width: 100%;
  height: 100%;
  animation-delay: 1.4s;
}

@keyframes pulse {
  0% {
    opacity: 0.85;
    transform: scale(0.82);
  }
  100% {
    opacity: 0;
    transform: scale(1.04);
  }
}

.center-ring {
  width: 36%;
  height: 36%;
  border-radius: 50%;
  padding: 3px;
  background: conic-gradient(from 210deg, #ff2a7a, #9945ff, #ffb800, #ff2a7a);
  box-shadow: 0 0 30px rgba(255, 42, 122, 0.5);
}
.me {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid var(--eve-bg);
}

.float {
  position: absolute;
  width: 14.5%;
  height: 14.5%;
  animation: floaty 3.2s ease-in-out infinite;
}
.float-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  border: 1.5px solid rgba(255, 255, 255, 0.45);
}
.float-dot {
  position: absolute;
  right: 1px;
  bottom: 1px;
  width: 28%;
  height: 28%;
  border-radius: 50%;
  background: var(--eve-green);
  border: 2px solid var(--eve-bg);
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.8);
}
.f0 { top: 1.5%; left: 40%; }
.f1 { top: 21%; right: 5.5%; animation-delay: 0.4s; }
.f2 { bottom: 18%; right: 9%; animation-delay: 0.8s; }
.f3 { bottom: 0.5%; left: 42%; animation-delay: 1.2s; }
.f4 { bottom: 21%; left: 5.5%; animation-delay: 1.6s; }
.f5 { top: 21%; left: 7%; animation-delay: 2s; }

@keyframes floaty {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-9px); }
}

.actions {
  flex: 0 0 auto;
  display: flex;
  gap: 14px;
  width: 100%;
  max-width: 340px;
}

.match-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 18px 0 16px;
  border-radius: 20px;
  color: #fff;

  .ico {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.18);
    backdrop-filter: blur(2px);
  }
  .t {
    font-size: 16px;
    font-weight: 800;
  }
  .c {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
    img {
      width: 13px;
      height: 13px;
    }
  }
}
.random {
  background: linear-gradient(150deg, #ff2a7a, #9945ff);
  box-shadow: 0 12px 26px rgba(255, 42, 122, 0.38);
}
.goddess {
  background: linear-gradient(150deg, #ffb800, #ff2a7a);
  box-shadow: 0 12px 26px rgba(255, 184, 0, 0.32);
}
</style>
