<template>
  <section class="nearby">
    <TopBar title="Nearby" />

    <div class="map">
      <span class="ring r1" />
      <span class="ring r2" />
      <span class="ring r3" />

      <div v-if="me" class="me-pin">
        <van-image round fit="cover" class="me-avatar" :src="me.avatar" lazy-load />
        <i class="tail" />
        <div class="me-label">{{ me.nickname }} <img :src="countryFlag(me.region)" alt="" /></div>
      </div>

      <button v-for="p in pins" :key="p.anchor.id" class="pin" :style="p.style" @click="router.push(`/anchor/${p.anchor.id}`)">
        <van-image round fit="cover" class="pin-avatar" :class="{ online: p.online }" :src="p.anchor.avatar" lazy-load />
        <i class="tail" :class="{ online: p.online }" />
        <span class="km">{{ p.km }} km</span>
      </button>

      <p class="tip">Based on your location, here are people nearby.</p>
    </div>

    <div class="strip">
      <button v-for="a in strip" :key="a.id" class="card" @click="router.push(`/anchor/${a.id}`)">
        <van-image fit="cover" class="cover" :src="a.avatar" lazy-load />
        <span class="status" :class="{ on: a.online }">{{ a.online ? "online" : "offline" }}</span>
        <span class="dist">{{ distance(a) }} km</span>
        <span class="name">{{ a.nickname }}, {{ a.age }}</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import TopBar from "../components/TopBar.vue";
import { api } from "../services/api";
import { countryFlag } from "../utils/assets";
import type { Anchor, CurrentUser } from "../types/eve";

const router = useRouter();
const me = ref<CurrentUser | null>(null);
const strip = ref<Anchor[]>([]);
const pins = ref<{ anchor: Anchor; km: number; online: boolean; style: { left: string; top: string } }[]>([]);
let timer: number | null = null;

const NEAR = [{ left: "38%", top: "30%" }, { left: "62%", top: "30%" }];
const MID = [{ left: "24%", top: "22%" }, { left: "76%", top: "22%" }];
const FAR = [{ left: "18%", top: "58%" }, { left: "82%", top: "58%" }];
const FARTHEST = [{ left: "12%", top: "14%" }, { left: "88%", top: "14%" }, { left: "14%", top: "70%" }, { left: "86%", top: "70%" }];

function distance(a: Anchor) {
  return +(0.4 + (a.id % 50) / 10).toFixed(1);
}
function bucketFor(km: number) {
  if (km <= 1.5) return NEAR;
  if (km <= 3) return MID;
  if (km <= 4.5) return FAR;
  return FARTHEST;
}
function slot(arr: { left: string; top: string }[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

onMounted(async () => {
  const [user, list] = await Promise.all([api.getCurrentUser(), api.getAnchors()]);
  me.value = user;
  strip.value = [...list].sort((a, b) => distance(a) - distance(b));
  pins.value = list.slice(0, 6).map((anchor) => {
    const km = distance(anchor);
    return { anchor, km, online: anchor.online, style: slot(bucketFor(km)) };
  });
  timer = window.setInterval(() => {
    pins.value.forEach((p) => (p.style = slot(bucketFor(p.km))));
  }, 5000);
});

onUnmounted(() => {
  if (timer) window.clearInterval(timer);
});
</script>

<style scoped lang="scss">
.nearby {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #2c1a1a;
}
.map {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background:
    repeating-linear-gradient(0deg, rgba(255, 84, 115, 0.06) 0 1px, transparent 1px 28px),
    repeating-linear-gradient(90deg, rgba(255, 84, 115, 0.06) 0 1px, transparent 1px 28px),
    radial-gradient(120% 80% at 50% 0%, #4a2330 0%, #2c1a1a 60%, #241213 100%);
}
.ring {
  position: absolute;
  left: 50%;
  top: 46%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 1px solid rgba(255, 84, 115, 0.18);
  animation: pulse 2.4s ease-out infinite;
}
.r1 { width: 120px; height: 120px; }
.r2 { width: 200px; height: 200px; animation-delay: 0.6s; }
.r3 { width: 280px; height: 280px; animation-delay: 1.2s; }
@keyframes pulse {
  0% { opacity: 0.8; transform: translate(-50%, -50%) scale(0.85); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(1.05); }
}
.me-pin {
  position: absolute;
  left: 50%;
  top: 46%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 10;
  .me-avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    overflow: hidden;
    border: 3px solid #eb6300;
    box-shadow: 0 0 20px rgba(235, 99, 0, 0.5);
  }
  .me-label {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 6px;
    font-size: 12px;
    font-weight: 600;
    color: #fff;
    img {
      width: 16px;
      height: 11px;
      border-radius: 2px;
    }
  }
}
.tail {
  width: 0;
  height: 0;
  border-left: 7px solid transparent;
  border-right: 7px solid transparent;
  border-top: 9px solid #eb6300;
  margin-top: -2px;
  &.online {
    border-top-color: #00e397;
  }
}
.pin {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  .pin-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    overflow: hidden;
    border: 2px solid rgba(255, 84, 115, 0.7);
    &.online {
      border-color: #00e397;
    }
  }
  .tail {
    border-top: 8px solid rgba(255, 84, 115, 0.7);
    &.online {
      border-top-color: #00e397;
    }
  }
  .km {
    margin-top: 3px;
    padding: 1px 6px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.4);
    color: #fff;
    font-size: 11px;
  }
}
.tip {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 12px;
  padding: 0 24px;
  text-align: center;
  font-size: 12px;
  color: #9a8b8b;
  pointer-events: none;
}
.strip {
  flex: 0 0 auto;
  display: flex;
  gap: 10px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  overflow-x: auto;
  background: #241213;
  &::-webkit-scrollbar {
    display: none;
  }
}
.card {
  position: relative;
  flex: 0 0 auto;
  width: 108px;
  border-radius: 14px;
  overflow: hidden;
  background: #3a2526;
  .cover {
    width: 108px;
    height: 132px;
    display: block;
  }
  .status {
    position: absolute;
    top: 6px;
    left: 6px;
    padding: 1px 8px;
    border-radius: 999px;
    font-size: 10px;
    color: #fff;
    background: rgba(0, 0, 0, 0.4);
    &.on {
      background: rgba(0, 227, 151, 0.8);
    }
  }
  .dist {
    position: absolute;
    bottom: 30px;
    left: 6px;
    padding: 1px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    color: #fff;
    background: linear-gradient(90deg, #ff5473, #eb6300);
  }
  .name {
    display: block;
    padding: 7px 8px;
    font-size: 12px;
    color: #fff;
    text-align: left;
  }
}
</style>
