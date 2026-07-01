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

    <!-- 主播照片栅格（上拉加载更多） -->
    <AppSkeleton v-if="loading" type="grid" />
    <template v-else>
      <van-list v-model:loading="listLoading" :finished="listFinished" :finished-text="t('home.noMore')" @load="onLoad">
        <div class="host-grid">
          <HostCard v-for="anchor in anchors" :key="anchor.id" :anchor="anchor" />
        </div>
      </van-list>
      <p v-if="!anchors.length && listFinished" class="empty">{{ t("home.empty") }}</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import HostCard from "../components/HostCard.vue";
import AppSkeleton from "../components/AppSkeleton.vue";
import { getAnchorsPage, getFollowingAnchors } from "../services/anchor";
import { getLiveRooms } from "../services/room";
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

// 推荐流分页（上拉加载更多）
const PAGE = 20;
const recoOffset = ref(0);
const recoTotal = ref(0);
const listLoading = ref(false);
const listFinished = ref(false);
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

// 上拉加载：仅推荐流分页(真实主播 feed);关注流是 mock,不分页
async function onLoad() {
  if (tab.value !== "recommend") {
    listFinished.value = true;
    listLoading.value = false;
    return;
  }
  try {
    const { items, total } = await getAnchorsPage(recoOffset.value, PAGE);
    recommended.value.push(...items);
    recoOffset.value += items.length;
    recoTotal.value = total;
    if (items.length === 0 || recommended.value.length >= total) listFinished.value = true;
  } catch {
    listFinished.value = true;
  } finally {
    listLoading.value = false;
  }
}

watch(tab, (v) => {
  listFinished.value = v === "follow" ? true : recoTotal.value > 0 && recommended.value.length >= recoTotal.value;
});

onMounted(async () => {
  // 首屏直接加载推荐流第一页(保证有内容),后续滚动由 van-list @load 续拉;直播条仍走 mock
  const [followingPage, l, first] = await Promise.all([
    getFollowingAnchors(0, PAGE).catch(() => ({ items: [] as Anchor[], total: 0 })),
    getLiveRooms().catch(() => [] as LiveRoom[]),
    getAnchorsPage(0, PAGE).catch(() => ({ items: [] as Anchor[], total: 0 }))
  ]);
  following.value = followingPage.items;
  lives.value = l;
  recommended.value = first.items;
  recoOffset.value = first.items.length;
  recoTotal.value = first.total;
  listFinished.value = recommended.value.length >= recoTotal.value;
  loading.value = false;
});
</script>

<style scoped lang="scss">
.home {
  height: 100vh;
  overflow-y: auto;
  padding-bottom: 78px;
  background: var(--eve-bg);
}

.top-tabs {
  position: sticky;
  top: 0;
  z-index: 19;
  display: flex;
  align-items: flex-end;
  gap: 22px;
  padding: calc(14px + env(safe-area-inset-top)) 16px 10px;
  background: var(--eve-bg);
}

.top-tab {
  position: relative;
  font-size: 18px;
  font-weight: 800;
  color: var(--eve-faint);
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
    color: #fff;
    .underline {
      background: var(--eve-grad);
      box-shadow: var(--eve-glow-pink);
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
  font-size: 12px;
  font-weight: 600;
  color: var(--eve-muted);
  background: var(--eve-surface);
  border: 1px solid var(--eve-line);
  border-radius: 20px;
  white-space: nowrap;

  &.active {
    color: #fff;
    background: var(--eve-grad);
    border-color: transparent;
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
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--eve-line);
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
  color: var(--eve-faint);
}
</style>
