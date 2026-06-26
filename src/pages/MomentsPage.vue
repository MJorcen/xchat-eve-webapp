<template>
  <section class="moments">
    <header class="top-tabs">
      <button :class="['top-tab', { active: tab === 'recommend' }]" @click="tab = 'recommend'">
        Discover<span class="underline" />
      </button>
      <button :class="['top-tab', { active: tab === 'follow' }]" @click="tab = 'follow'">
        Following<span class="underline" />
      </button>
    </header>

    <div class="feed">
      <MomentCard v-for="item in moments" :key="item.id" :moment="item" />
    </div>

    <button class="compose" @click="router.push('/video-upload-dynamic')">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import MomentCard from "../components/MomentCard.vue";
import { api } from "../services/api";
import type { Moment } from "../types/eve";

const router = useRouter();
const tab = ref<"recommend" | "follow">("recommend");
const allMoments = ref<Moment[]>([]);

// Following 标签展示已关注的子集，与 Discover 区分
const moments = computed(() =>
  tab.value === "recommend" ? allMoments.value : allMoments.value.filter((_, i) => i % 2 === 0)
);

onMounted(async () => {
  allMoments.value = await api.getMoments();
});
</script>

<style scoped lang="scss">
.moments {
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
  padding: calc(14px + env(safe-area-inset-top)) 16px 12px;
  background: #2c1a1a;
}

.top-tab {
  position: relative;
  font-size: 18px;
  font-weight: 700;
  color: #888;

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
    color: #eb6300;
    .underline {
      background: #eb6300;
    }
  }
}

.feed {
  margin-top: 4px;
}

.compose {
  position: fixed;
  right: calc(50% - 200px + 16px);
  bottom: 96px;
  z-index: 25;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff5473, #eb6300);
  box-shadow: 0 8px 20px rgba(235, 99, 0, 0.45);
  display: grid;
  place-items: center;
}

@media (max-width: 430px) {
  .compose {
    right: 16px;
  }
}
</style>
