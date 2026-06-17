<template>
  <article class="moment-card">
    <div class="moment-head">
      <img :src="moment.user.avatar" alt="" @click="router.push(`/anchor/${moment.user.id}`)" />
      <strong>{{ moment.user.nickname }}</strong>
      <img class="flag" :src="countryFlag(moment.user.region)" alt="" />
      <button @click="showActions = !showActions">•••</button>
    </div>
    <p>{{ translated ? "Translated: " + moment.content : moment.content }}</p>
    <button class="translate" @click="translated = !translated">🌐 {{ translated ? "Hide translation" : "See translation" }}</button>
    <div class="moment-images">
      <img v-for="image in moment.images" :key="image" :src="image" alt="" />
    </div>
    <div class="moment-actions">
      <button @click="liked = !liked">{{ liked ? "♥" : "♡" }} {{ likeCount }}</button>
      <button @click="router.push(`/chat/${moment.user.id}`)">💬 Chat</button>
      <button @click="openCall(moment.user)">📹 Call</button>
    </div>
    <div v-if="showActions" class="inline-actions">
      <button>Block</button>
      <button>Report</button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useCall } from "../composables/useCall";
import type { Moment } from "../types/eve";
import { countryFlag } from "../utils/assets";

const props = defineProps<{ moment: Moment }>();
const router = useRouter();
const { openCall } = useCall();

const liked = ref(props.moment.liked);
const translated = ref(false);
const showActions = ref(false);
const likeCount = computed(() => props.moment.likes + (liked.value && !props.moment.liked ? 1 : 0));
</script>
