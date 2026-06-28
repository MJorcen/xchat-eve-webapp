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
      <van-list v-model:loading="listLoading" :finished="listFinished" :finished-text="t('moments.noMore')" @load="onLoad">
        <MomentCard v-for="item in display" :key="item.id" :moment="item" />
      </van-list>
    </van-pull-refresh>

    <button class="compose" @click="router.push('/video-upload-dynamic')">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import MomentCard from "../components/MomentCard.vue";
import AppSkeleton from "../components/AppSkeleton.vue";
import { api } from "../services/api";
import { useMomentsStore } from "../stores";
import type { Moment } from "../types/eve";

defineOptions({ name: "MomentsPage" });

const { t } = useI18n();
const router = useRouter();
const tab = ref<"recommend" | "follow">("recommend");
const momentsStore = useMomentsStore();
const loading = ref(momentsStore.list.length === 0);

// 读 store(新发布的动态会 prepend 进来);Following 标签展示子集
const moments = computed(() =>
  tab.value === "recommend" ? momentsStore.list : momentsStore.list.filter((_, i) => i % 2 === 0)
);

// 下拉刷新 + 上拉加载(mock:循环克隆已有动态)
const extra = ref<Moment[]>([]);
const display = computed(() => [...moments.value, ...extra.value]);
const refreshing = ref(false);
const listLoading = ref(false);
const listFinished = ref(false);
let cloneSeq = 1;

function onLoad() {
  const base = moments.value;
  if (!base.length || display.value.length >= 24) {
    listFinished.value = true;
    listLoading.value = false;
    return;
  }
  const clones = base.slice(0, 4).map((m) => ({ ...m, id: -cloneSeq++ }));
  extra.value.push(...clones);
  listLoading.value = false;
  if (display.value.length >= 24) listFinished.value = true;
}

function onRefresh() {
  extra.value = [];
  listFinished.value = false;
  window.setTimeout(() => (refreshing.value = false), 600);
}

watch(tab, () => {
  extra.value = [];
  listFinished.value = false;
});

onMounted(async () => {
  momentsStore.seed(await api.getMoments());
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
