<template>
  <article class="host-card" @click="router.push(`/anchor/${anchor.id}`)">
    <img class="host-photo" :src="anchor.avatar" :alt="anchor.nickname" />
    <button class="call-bubble" @click.stop="openCall(anchor)">☎</button>
    <div class="host-meta">
      <span class="age">♀ {{ anchor.age }}</span>
      <img class="flag" :src="countryFlag(anchor.region)" alt="" />
    </div>
    <div class="host-name-row">
      <span :class="anchor.online ? 'dot online' : 'dot'"></span>
      <span class="status">{{ anchor.online ? "onLine" : "offline" }}</span>
      <strong>{{ anchor.nickname }}</strong>
    </div>
  </article>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { useCall } from "../composables/useCall";
import type { Anchor } from "../types/eve";
import { countryFlag } from "../utils/assets";

defineProps<{ anchor: Anchor }>();

const router = useRouter();
const { openCall } = useCall();
</script>
