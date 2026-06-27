<template>
  <section class="page">
    <TopBar :title="t('visitor.title')" />
    <div v-if="visitors.length" class="list">
      <article v-for="a in visitors" :key="a.id" class="row" @click="router.push(`/anchor/${a.id}`)">
        <div class="avatar-wrap">
          <van-image round fit="cover" class="avatar" :src="a.avatar" lazy-load />
          <span v-if="a.online" class="dot" />
        </div>
        <div class="body">
          <strong>{{ a.nickname }}</strong>
          <span class="id">ID: {{ a.id }}</span>
        </div>
        <div class="meta">
          <b>{{ t("visitor.visits", { count: (a.id % 3) + 1 }) }}</b>
          <span>{{ [t("visitor.time2m"), t("visitor.time1h"), t("visitor.timeYesterday"), t("visitor.time3d")][a.id % 4] }}</span>
        </div>
      </article>
    </div>
    <EmptyState v-else :text="t('visitor.empty')" />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import TopBar from "../components/TopBar.vue";
import EmptyState from "../components/EmptyState.vue";
import { api } from "../services/api";
import type { Anchor } from "../types/eve";

const { t } = useI18n();
const router = useRouter();
const visitors = ref<Anchor[]>([]);
onMounted(async () => (visitors.value = await api.getVisitors()));
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #2c1a1a;
}
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #241213;
}
.avatar-wrap {
  position: relative;
  flex: 0 0 auto;
}
.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
}
.dot {
  position: absolute;
  right: 1px;
  bottom: 1px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #00e397;
  border: 2px solid #2c1a1a;
}
.body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  strong {
    font-size: 16px;
    font-weight: 600;
    color: #fff;
  }
  .id {
    font-size: 13px;
    color: #eb6300;
  }
}
.meta {
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 3px;
  b {
    font-size: 13px;
    color: #eb6300;
  }
  span {
    font-size: 12px;
    color: #9a8b8b;
  }
}
</style>
