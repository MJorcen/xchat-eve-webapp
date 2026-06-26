<template>
  <section class="match">
    <header class="head">
      <h1>Match</h1>
      <p>Meet someone new in one tap</p>
    </header>

    <!-- 雷达区 -->
    <div class="radar">
      <span class="glow" />
      <span class="ring r1" />
      <span class="ring r2" />
      <span class="ring r3" />
      <div class="center">
        <van-image round fit="cover" class="me" :src="user?.avatar" lazy-load />
      </div>
      <!-- 漂浮的主播头像 -->
      <van-image
        v-for="(a, i) in floats"
        :key="a.id"
        round
        fit="cover"
        class="float"
        :class="`f${i}`"
        :src="a.avatar"
        lazy-load
      />
    </div>

    <!-- 匹配按钮 -->
    <div class="actions">
      <button class="match-btn random" @click="startMatch('Random')">
        <span class="t">Random</span>
        <small class="c">300 <img src="/assets/eve/matchHome/coin_20@2x.png" alt="" /> / match</small>
      </button>
      <button class="match-btn goddess" @click="startMatch('Goddess')">
        <span class="t">Goddess</span>
        <small class="c">500 <img src="/assets/eve/matchHome/coin_20@2x.png" alt="" /> / match</small>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "../services/api";
import type { Anchor, CurrentUser } from "../types/eve";

defineOptions({ name: "MatchPage" });

const router = useRouter();
const user = ref<CurrentUser | null>(null);
const floats = ref<Anchor[]>([]);

onMounted(async () => {
  user.value = await api.getCurrentUser();
  floats.value = (await api.getAnchors()).slice(0, 6);
});

function startMatch(type: string) {
  router.push({ name: "MatchNew", query: { type } });
}
</script>

<style scoped lang="scss">
.match {
  min-height: 100vh;
  padding: 24px 16px 100px;
  background: radial-gradient(120% 60% at 50% 0%, #4a2330 0%, #2c1a1a 60%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.head {
  text-align: center;
  h1 {
    font-size: 26px;
    font-weight: 800;
    color: #fff;
  }
  p {
    margin-top: 6px;
    font-size: 13px;
    color: #b0a0a0;
  }
}

.radar {
  position: relative;
  width: 280px;
  height: 280px;
  margin: 40px 0 48px;
  display: grid;
  place-items: center;
}

.ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255, 84, 115, 0.35);
  animation: pulse 2.4s ease-out infinite;
}
.r1 {
  width: 140px;
  height: 140px;
}
.r2 {
  width: 210px;
  height: 210px;
  animation-delay: 0.6s;
}
.r3 {
  width: 280px;
  height: 280px;
  animation-delay: 1.2s;
}

@keyframes pulse {
  0% {
    opacity: 0.8;
    transform: scale(0.85);
  }
  100% {
    opacity: 0;
    transform: scale(1.05);
  }
}

.glow {
  position: absolute;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 84, 115, 0.35) 0%, rgba(255, 84, 115, 0) 70%);
}

.center .me {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid rgba(255, 84, 115, 0.7);
  box-shadow: 0 0 24px rgba(255, 84, 115, 0.5);
}

.float {
  position: absolute;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.25);
  animation: floaty 3s ease-in-out infinite;
}
.f0 { top: 6px; left: 110px; }
.f1 { top: 60px; right: 18px; animation-delay: 0.4s; }
.f2 { bottom: 50px; right: 26px; animation-delay: 0.8s; }
.f3 { bottom: 4px; left: 116px; animation-delay: 1.2s; }
.f4 { bottom: 58px; left: 18px; animation-delay: 1.6s; }
.f5 { top: 58px; left: 22px; animation-delay: 2s; }

@keyframes floaty {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.actions {
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
  gap: 5px;
  padding: 16px 0;
  border-radius: 18px;
  color: #fff;

  .t {
    font-size: 17px;
    font-weight: 700;
  }
  .c {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    opacity: 0.92;
    img {
      width: 14px;
      height: 14px;
    }
  }
}
.random {
  background: linear-gradient(135deg, #ff5473, #ff7a59);
  box-shadow: 0 10px 24px rgba(255, 84, 115, 0.4);
}
.goddess {
  background: linear-gradient(135deg, #a85cff, #eb6300);
  box-shadow: 0 10px 24px rgba(168, 92, 255, 0.4);
}
</style>
