<template>
  <section class="page chat-page">
    <header>
      <button @click="router.back()">‹</button>
      <strong>{{ anchor.nickname }}</strong>
      <button @click="router.push(`/call/${anchor.id}`)">📹</button>
    </header>
    <div class="bubble left">Hi, are you free now?</div>
    <div class="bubble right">Hello</div>
    <div class="bubble left">Video call?</div>
    <div class="bubble right">Maybe later. Nice to meet you.</div>
    <footer>
      <button>＋</button>
      <input v-model="draft" placeholder="Say something..." @keyup.enter="draft = ''" />
      <button @click="draft = ''">➤</button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { eveMockApi } from "../services/eveMockApi";

const route = useRoute();
const router = useRouter();
const anchor = eveMockApi.getAnchor(Number(route.params.id));
const draft = ref("");
</script>
