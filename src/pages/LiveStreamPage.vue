<template>
  <section class="call-screen live-screen">
    <video class="live-video" autoplay muted loop playsinline :poster="anchor.avatar">
      <source src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" type="video/mp4" />
    </video>
    <div class="stream-noise"></div>

    <header class="call-top">
      <div>
        <img :src="anchor.avatar" alt="" />
        <div>
          <strong>{{ anchor.nickname }}</strong>
          <span>Free preview · Live stream</span>
        </div>
      </div>
      <button @click="router.back()">✕</button>
    </header>

    <div class="call-timer">Preview {{ elapsed }}</div>

    <div class="local-stream">
      <img :src="user.avatar" alt="" />
      <button>⇄</button>
    </div>

    <div class="call-messages">
      <span>{{ anchor.nickname }}: Welcome</span>
      <span>System: Tap call to start video chat</span>
    </div>

    <footer class="call-controls">
      <button>🎙</button>
      <button>📷</button>
      <input disabled placeholder="Unlock chat during call" />
      <button @click="router.push(`/call/${anchor.id}`)">☎</button>
      <button @click="router.push('/recharge')">🪙</button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { eveMockApi } from "../services/eveMockApi";

const route = useRoute();
const router = useRouter();
const anchor = eveMockApi.getAnchor(Number(route.params.id));
const user = eveMockApi.getCurrentUser();
const seconds = ref(0);
let timer: number | undefined;

const elapsed = computed(() => {
  const min = String(Math.floor(seconds.value / 60)).padStart(2, "0");
  const sec = String(seconds.value % 60).padStart(2, "0");
  return `${min}:${sec}`;
});

onMounted(() => {
  timer = window.setInterval(() => {
    seconds.value += 1;
  }, 1000);
});

onUnmounted(() => {
  if (timer) window.clearInterval(timer);
});
</script>
