<template>
  <section class="home">
    <!-- 顶部主标签 Recommend / Following -->
    <header class="top-tabs">
      <button :class="['top-tab', { active: tab === 'recommend' }]" @click="tab = 'recommend'">
        Recommend
        <span class="underline" />
      </button>
      <button :class="['top-tab', { active: tab === 'follow' }]" @click="tab = 'follow'">
        Following
        <span class="underline" />
      </button>
    </header>

    <!-- 分类胶囊 -->
    <nav class="chips">
      <button
        v-for="c in categories"
        :key="c"
        :class="['chip', { active: category === c }]"
        @click="category = c"
      >
        {{ c }}
      </button>
    </nav>

    <!-- 主播照片栅格 -->
    <div class="host-grid">
      <HostCard v-for="anchor in anchors" :key="anchor.id" :anchor="anchor" />
    </div>

    <p v-if="!anchors.length" class="empty">No one here yet</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import HostCard from "../components/HostCard.vue";
import { api } from "../services/api";
import type { Anchor } from "../types/eve";

const tab = ref<"recommend" | "follow">("recommend");
const categories = ["All", "Hot", "New", "Nearby", "Dance"];
const category = ref("All");

const recommended = ref<Anchor[]>([]);
const following = ref<Anchor[]>([]);
const anchors = computed(() => (tab.value === "recommend" ? recommended.value : following.value));

onMounted(async () => {
  [recommended.value, following.value] = await Promise.all([api.getAnchors(), api.getFollowing()]);
});
</script>

<style scoped lang="scss">
.home {
  min-height: 100vh;
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
