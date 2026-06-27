<template>
  <section class="home">
    <!-- 顶部主标签 Recommend / Following -->
    <header class="top-tabs">
      <button :class="['top-tab', { active: tab === 'recommend' }]" @click="tab = 'recommend'">
        {{ t("home.recommend") }}
        <span class="underline" />
      </button>
      <button :class="['top-tab', { active: tab === 'follow' }]" @click="tab = 'follow'">
        {{ t("home.following") }}
        <span class="underline" />
      </button>
    </header>

    <!-- 分类胶囊 -->
    <nav class="chips">
      <button
        v-for="c in categories"
        :key="c"
        :class="['chip', { active: category === c }]"
        @click="onChip(c)"
      >
        {{ t(`home.${c}`) }}
      </button>
    </nav>

    <!-- 直播条 -->
    <div v-if="lives.length" class="live-strip">
      <button v-for="room in lives" :key="room.id" class="live-card" @click="router.push(`/live/${room.id}`)">
        <van-image fit="cover" class="live-cover" :src="room.cover" lazy-load />
        <span class="live-pill"><i />LIVE</span>
        <span class="live-viewers">{{ formatViewers(room.viewers) }}</span>
        <span class="live-name">{{ room.anchor.nickname }}</span>
      </button>
    </div>

    <!-- 主播照片栅格 -->
    <AppSkeleton v-if="loading" type="grid" />
    <template v-else>
      <div class="host-grid">
        <HostCard v-for="anchor in anchors" :key="anchor.id" :anchor="anchor" />
      </div>
      <p v-if="!anchors.length" class="empty">{{ t("home.empty") }}</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import HostCard from "../components/HostCard.vue";
import AppSkeleton from "../components/AppSkeleton.vue";
import { api } from "../services/api";
import type { Anchor, LiveRoom } from "../types/eve";

defineOptions({ name: "HomePage" });

const { t } = useI18n();
const router = useRouter();
const tab = ref<"recommend" | "follow">("recommend");
// key 用于逻辑/筛选,展示文案走 t(`home.${key}`)
const categories = ["all", "hot", "new", "nearby", "dance"];
const category = ref("all");
const loading = ref(true);

const recommended = ref<Anchor[]>([]);
const following = ref<Anchor[]>([]);
const lives = ref<LiveRoom[]>([]);
const anchors = computed(() => {
  const base = tab.value === "recommend" ? recommended.value : following.value;
  if (category.value === "hot") return base.filter((a) => a.online);
  if (category.value === "new") return [...base].reverse();
  return base;
});

function formatViewers(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

// "nearby" 胶囊跳附近页,其余作为筛选
function onChip(c: string) {
  if (c === "nearby") router.push("/nearby");
  else category.value = c;
}

onMounted(async () => {
  [recommended.value, following.value, lives.value] = await Promise.all([
    api.getAnchors(),
    api.getFollowing(),
    api.getLiveRooms()
  ]);
  loading.value = false;
});
</script>

<style scoped lang="scss">
.home {
  height: 100vh;
  overflow-y: auto;
  padding-bottom: 84px;
  background: #2c1a1a;
}

.top-tabs {
  position: sticky;
  top: 0;
  z-index: 19;
  display: flex;
  align-items: flex-end;
  gap: 22px;
  padding: calc(14px + env(safe-area-inset-top)) 16px 10px;
  background: #2c1a1a;
}

.top-tab {
  position: relative;
  font-size: 18px;
  font-weight: 700;
  color: #888;
  transition: color 0.2s;

  .underline {
    position: absolute;
    left: 0;
    right: 0;
    bottom: -6px;
    height: 3px;
    border-radius: 3px;
    background: transparent;
  }

  &.active {
    font-size: 22px;
    color: #eb6300;
    .underline {
      background: #eb6300;
    }
  }
}

.chips {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  &::-webkit-scrollbar {
    display: none;
  }
}

.chip {
  flex: 0 0 auto;
  height: 30px;
  padding: 0 14px;
  font-size: 13px;
  color: #c8bcbc;
  background: #3a2526;
  border-radius: 20px;
  white-space: nowrap;

  &.active {
    color: #fff;
    background: linear-gradient(135deg, #ff5473, #eb6300);
  }
}

.live-strip {
  display: flex;
  gap: 10px;
  padding: 4px 16px 10px;
  overflow-x: auto;
  &::-webkit-scrollbar {
    display: none;
  }
}
.live-card {
  position: relative;
  flex: 0 0 auto;
  width: 116px;
  height: 150px;
  border-radius: 14px;
  overflow: hidden;
  .live-cover {
    width: 100%;
    height: 100%;
  }
  .live-pill {
    position: absolute;
    top: 8px;
    left: 8px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    color: #fff;
    background: #ff3b30;
    i {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #fff;
    }
  }
  .live-viewers {
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 2px 7px;
    border-radius: 999px;
    font-size: 10px;
    color: #fff;
    background: rgba(0, 0, 0, 0.4);
  }
  .live-name {
    position: absolute;
    left: 8px;
    bottom: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #fff;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
  }
}

.host-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  padding: 6px 16px 0;
}

.empty {
  margin-top: 80px;
  text-align: center;
  color: #6f5b5b;
}
</style>
