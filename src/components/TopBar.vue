<template>
  <header class="topbar">
    <button class="topbar-back" @click="router.back()">‹</button>
    <h1>{{ title }}</h1>
    <slot />
  </header>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";

defineProps<{ title: string }>();

const router = useRouter();
</script>
