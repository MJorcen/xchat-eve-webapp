<template>
  <section class="moments">
    <header class="top-tabs">
      <button :class="['top-tab', { active: tab === 'recommend' }]" @click="tab = 'recommend'">
        {{ t("moments.discover") }}<span class="underline" />
      </button>
      <button :class="['top-tab', { active: tab === 'follow' }]" @click="tab = 'follow'">
        {{ t("moments.following") }}<span class="underline" />
      </button>
    </header>

    <AppSkeleton v-if="loading" type="list" />
    <van-pull-refresh v-else v-model="refreshing" @refresh="onRefresh">
      <van-list
        v-model:loading="listLoading"
        :finished="listFinished"
        :finished-text="display.length ? t('moments.noMore') : ''"
        @load="onLoad"
      >
        <MomentCard v-for="item in display" :key="item.id" :moment="item" />
      </van-list>
      <p v-if="listFinished && !display.length" class="empty">{{ t("moments.empty") }}</p>
    </van-pull-refresh>

    <button v-show="composeVisible" class="compose" @click="router.push('/video-upload-dynamic')">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed, onActivated, onDeactivated, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import MomentCard from "../components/MomentCard.vue";
import AppSkeleton from "../components/AppSkeleton.vue";
import { useCall } from "../composables/useCall";
import { getMomentsFeed } from "../services/moment";
import { useMomentsStore } from "../stores";
import type { Moment } from "../types/eve";

defineOptions({ name: "MomentsPage" });

const { t } = useI18n();
const router = useRouter();
const momentsStore = useMomentsStore();

// 发现/关注两条真实流(/facade/post/list listType 0/1),各自分页
const PAGE = 10;
const tab = ref<"recommend" | "follow">("recommend");
const recommend = ref<Moment[]>([]);
const follow = ref<Moment[]>([]);
const recoOffset = ref(0);
const recoTotal = ref(0);
const followOffset = ref(0);
const followTotal = ref(0);

const loading = ref(true);
const refreshing = ref(false);
const listLoading = ref(false);
const listFinished = ref(false);

// keep-alive tab:离开/通话时隐藏 position:fixed 的悬浮发布按钮,否则会残留在其它页/来电弹窗上
const { callState } = useCall();
const tabActive = ref(true);
onActivated(() => (tabActive.value = true));
onDeactivated(() => (tabActive.value = false));
const composeVisible = computed(() => tabActive.value && callState.phase === "idle");

// 推荐流顶部叠加本地新发布(momentsStore，去重);关注流直接用真实流
const display = computed<Moment[]>(() => {
  if (tab.value !== "recommend") return follow.value;
  const ids = new Set(recommend.value.map((m) => m.id));
  return [...momentsStore.list.filter((m) => !ids.has(m.id)), ...recommend.value];
});

let inFlight = false;
async function loadPage() {
  if (inFlight) return;
  inFlight = true;
  const isReco = tab.value === "recommend";
  const list = isReco ? recommend : follow;
  const offsetRef = isReco ? recoOffset : followOffset;
  const totalRef = isReco ? recoTotal : followTotal;
  try {
    const { items, total } = await getMomentsFeed(isReco ? 0 : 1, offsetRef.value, PAGE);
    list.value.push(...items);
    offsetRef.value += items.length;
    totalRef.value = total;
    if (items.length === 0 || list.value.length >= total) listFinished.value = true;
  } catch {
    listFinished.value = true;
  } finally {
    listLoading.value = false;
    inFlight = false;
  }
}

function onLoad() {
  loadPage();
}

function onRefresh() {
  const isReco = tab.value === "recommend";
  (isReco ? recommend : follow).value = [];
  (isReco ? recoOffset : followOffset).value = 0;
  listFinished.value = false;
  loadPage().finally(() => (refreshing.value = false));
}

watch(tab, () => {
  const isReco = tab.value === "recommend";
  const list = isReco ? recommend.value : follow.value;
  const total = isReco ? recoTotal.value : followTotal.value;
  listLoading.value = false;
  listFinished.value = list.length > 0 && list.length >= total;
  // 首次进入该 tab → 主动拉首屏(内容未填满时 van-list 不会自动 @load)
  if (list.length === 0 && !listFinished.value) loadPage();
});

onMounted(async () => {
  await loadPage(); // 推荐流首屏(van-list 在 v-else,加载完才挂载,避免与 @load 竞争)
  loading.value = false;
});
</script>

<style scoped lang="scss">
.moments {
  height: 100vh;
  overflow-y: auto;
  padding-bottom: 84px;
  background: var(--eve-bg);
}

.top-tabs {
  position: sticky;
  top: 0;
  z-index: 19;
  display: flex;
  align-items: flex-end;
  gap: 22px;
  padding: calc(14px + env(safe-area-inset-top)) 16px 12px;
  background: var(--eve-bg);
}

.top-tab {
  position: relative;
  font-size: 18px;
  font-weight: 800;
  color: var(--eve-faint);

  .underline {
    position: absolute;
    left: 0;
    right: 0;
    bottom: -7px;
    height: 3px;
    border-radius: 3px;
    background: transparent;
  }

  &.active {
    font-size: 21px;
    color: #fff;
    .underline {
      background: var(--eve-grad);
      box-shadow: var(--eve-glow-pink);
    }
  }
}

:deep(.van-pull-refresh__head) {
  color: var(--eve-faint);
}
:deep(.van-list__finished-text),
:deep(.van-list__loading) {
  color: var(--eve-faint);
}

.empty {
  margin-top: 80px;
  text-align: center;
  color: var(--eve-faint);
}

.compose {
  position: fixed;
  right: calc(50% - 200px + 16px);
  bottom: 96px;
  z-index: 25;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--eve-grad);
  box-shadow: var(--eve-glow-pink);
  display: grid;
  place-items: center;
}

@media (max-width: 430px) {
  .compose {
    right: 16px;
  }
}
</style>
