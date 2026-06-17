<template>
  <section class="page">
    <TopBar title="Moment" />
    <MomentCard v-for="item in moments" :key="item.id" :moment="item" />
  </section>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";
import MomentCard from "../components/MomentCard.vue";
import TopBar from "../components/TopBar.vue";
import { eveMockApi } from "../services/eveMockApi";

const route = useRoute();
const moments = eveMockApi.getUserMoments(Number(route.params.id));
</script>
