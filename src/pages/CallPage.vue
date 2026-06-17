<template>
  <section class="call-screen">
    <div class="remote-stream">
      <img :src="anchor.avatar" alt="" />
      <div class="stream-noise"></div>
      <div class="stream-label">Remote video stream placeholder</div>
    </div>

    <header class="call-top">
      <div>
        <img :src="anchor.avatar" alt="" />
        <div>
          <strong>{{ anchor.nickname }}</strong>
          <span><img src="/assets/eve/callDialog/coin_300@2x.png" alt="" /> {{ anchor.price }}/min</span>
        </div>
      </div>
      <button @click="finishCall">✕</button>
    </header>

    <div class="call-timer">{{ elapsed }}</div>

    <div class="local-stream">
      <img :src="user.avatar" alt="" />
      <button>⇄</button>
    </div>

    <div class="call-messages">
      <span>I send you a gift 🌹 x1</span>
      <span>{{ anchor.nickname }}: Hi</span>
    </div>

    <button class="gift-float">🎁</button>

    <footer class="call-controls">
      <button :class="{ muted: !micOn }" @click="micOn = !micOn">{{ micOn ? "🎙" : "🔇" }}</button>
      <button :class="{ muted: !cameraOn }" @click="cameraOn = !cameraOn">{{ cameraOn ? "📷" : "🚫" }}</button>
      <input v-model="message" placeholder="Say something..." />
      <button @click="message = ''">➤</button>
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
const micOn = ref(true);
const cameraOn = ref(true);
const message = ref("");
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

function finishCall() {
  router.push(`/call-summary/${anchor.id}?duration=${seconds.value}`);
}
</script>
