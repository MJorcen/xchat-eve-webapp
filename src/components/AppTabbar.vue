<template>
  <nav class="tabbar">
    <button
      v-for="tab in tabs"
      :key="tab.path"
      :class="['tab', { active: route.path === tab.path }]"
      @click="router.push(tab.path)"
    >
      <span class="ico">
        <component :is="tab.icon" :size="24" :stroke-width="route.path === tab.path ? 2.2 : 1.8" />
        <b v-if="tab.badge">3</b>
      </span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { Home, Sparkles, Compass, MessageCircle, User } from "lucide-vue-next";

const route = useRoute();
const router = useRouter();

const tabs = [
  { path: "/", icon: Home },
  { path: "/match", icon: Sparkles },
  { path: "/moments", icon: Compass },
  { path: "/messages", icon: MessageCircle, badge: true },
  { path: "/mine", icon: User }
];
</script>

<style scoped lang="scss">
.tabbar {
  position: fixed;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: min(400PX, 100vw);
  height: calc(60px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  background: rgba(11, 7, 18, 0.92);
  backdrop-filter: blur(14px);
  border-top: 1px solid var(--eve-line);
  z-index: 30;
}

.tab {
  position: relative;
  display: grid;
  place-items: center;
  color: var(--eve-faint);
  transition: color 0.2s;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 22px;
    height: 2px;
    border-radius: 0 0 3px 3px;
    background: transparent;
    transition: background 0.2s;
  }

  &.active {
    color: var(--eve-pink);
    filter: drop-shadow(0 0 6px rgba(255, 42, 122, 0.55));
    &::before {
      background: var(--eve-pink);
    }
  }
}

.ico {
  position: relative;
  display: grid;
  place-items: center;
}

.ico b {
  position: absolute;
  top: -5px;
  right: -8px;
  min-width: 15px;
  height: 15px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--eve-pink);
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  line-height: 15px;
  text-align: center;
  box-shadow: 0 0 0 2px var(--eve-bg);
}
</style>
