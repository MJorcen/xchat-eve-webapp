<template>
  <section class="page">
    <TopBar title="Follow & Fans" />

    <div class="tabs">
      <button :class="['tab', { active: tab === 0 }]" @click="tab = 0">Following<i /></button>
      <button :class="['tab', { active: tab === 1 }]" @click="tab = 1">Fans<i /></button>
    </div>

    <div class="list">
      <template v-if="current.length">
        <article v-for="a in current" :key="a.id" class="row" @click="router.push(`/anchor/${a.id}`)">
          <div class="avatar-wrap">
            <van-image round fit="cover" class="avatar" :src="a.avatar" lazy-load />
            <span v-if="a.online" class="dot" />
          </div>
          <div class="body">
            <strong>{{ a.nickname }}</strong>
            <span class="id">ID: {{ a.id }}</span>
          </div>
          <van-icon name="arrow" class="arrow" />
        </article>
      </template>
      <EmptyState v-else :text="tab === 0 ? 'Not following anyone yet' : 'No fans yet'" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import TopBar from "../components/TopBar.vue";
import EmptyState from "../components/EmptyState.vue";
import { api } from "../services/api";
import type { Anchor } from "../types/eve";

const route = useRoute();
const router = useRouter();
const tab = ref(route.query.type === "followers" ? 1 : 0);
const following = ref<Anchor[]>([]);
const fans = ref<Anchor[]>([]);
const current = computed(() => (tab.value === 0 ? following.value : fans.value));

onMounted(async () => {
  [following.value, fans.value] = await Promise.all([api.getFollowing(), api.getAnchors()]);
});
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #2c1a1a;
}
.tabs {
  display: flex;
  border-bottom: 1px solid #241213;
}
.tab {
  position: relative;
  flex: 1;
  padding: 14px 0;
  font-size: 15px;
  color: #9a8b8b;
  i {
    position: absolute;
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
    width: 24px;
    height: 3px;
    border-radius: 3px;
    background: transparent;
  }
  &.active {
    color: #fff;
    font-weight: 600;
    i {
      background: linear-gradient(90deg, #ff5473, #eb6300);
    }
  }
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
.arrow {
  color: #6f5b5b;
}
</style>
