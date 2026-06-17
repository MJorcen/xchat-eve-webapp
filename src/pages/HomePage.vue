<template>
  <section class="page with-tab">
    <div class="segment">
      <button :class="{ active: tab === 'recommend' }" @click="tab = 'recommend'">Recommend</button>
      <button :class="{ active: tab === 'follow' }" @click="tab = 'follow'">Following</button>
    </div>
    <div class="host-grid">
      <HostCard v-for="anchor in anchors" :key="anchor.id" :anchor="anchor" />
    </div>
    <button class="home-live-entry" @click="router.push(`/live/${anchors[0].id}`)">Watch live preview</button>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import HostCard from "../components/HostCard.vue";
import { eveMockApi } from "../services/eveMockApi";

const tab = ref<"recommend" | "follow">("recommend");
const router = useRouter();
const anchors = computed(() => (tab.value === "recommend" ? eveMockApi.getAnchors() : eveMockApi.getFollowing()));
</script>
