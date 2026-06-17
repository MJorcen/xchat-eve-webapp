<template>
  <nav class="tabbar">
    <button v-for="tab in tabs" :key="tab.path" :class="{ active: route.path === tab.path }" @click="router.push(tab.path)">
      <img :src="route.path === tab.path ? tab.activeIcon : tab.icon" alt="" />
      <b v-if="tab.badge">3</b>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const tabs = [
  { path: "/", icon: "/assets/eve/home.png", activeIcon: "/assets/eve/homeActive.png" },
  { path: "/match", icon: "/assets/eve/match.png", activeIcon: "/assets/eve/matchActive.png" },
  { path: "/moments", icon: "/assets/eve/gc.png", activeIcon: "/assets/eve/gcActive.png" },
  { path: "/messages", icon: "/assets/eve/icon@2x (4).png", activeIcon: "/assets/eve/icon@2x (3).png", badge: true },
  { path: "/mine", icon: "/assets/eve/icon@2x (2).png", activeIcon: "/assets/eve/icon@2x (1).png" }
];
</script>
