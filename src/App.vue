<template>
  <main class="phone-shell" :class="{ dark: route.name === 'Match' }">
    <RouterView />
    <AppTabbar v-if="showTabbar" />
    <CallModal />
  </main>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterView, useRoute } from "vue-router";
import AppTabbar from "./components/AppTabbar.vue";
import CallModal from "./components/CallModal.vue";
import { tabRouteNames } from "./router";

const route = useRoute();
const showTabbar = computed(() => tabRouteNames.includes(String(route.name)));
</script>
