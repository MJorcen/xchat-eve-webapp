<template>
  <section class="page with-tab">
    <header class="page-title">Moment</header>
    <MomentCard v-for="item in moments" :key="item.id" :moment="item" />
    <button class="float-compose" @click="router.push('/video-upload-dynamic')">＋</button>
  </section>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import MomentCard from "../components/MomentCard.vue";
import { eveMockApi } from "../services/eveMockApi";

const router = useRouter();
const moments = eveMockApi.getMoments();
</script>
