<template>
  <section class="page detail-page">
    <button class="back" @click="router.back()">‹</button>
    <button class="more" @click="showActions = !showActions">⋯</button>
    <div v-if="showActions" class="detail-menu">
      <button>Block</button>
      <button>Report</button>
    </div>
    <img class="detail-cover" :src="anchor.avatar" alt="" />
    <div class="detail-body">
      <div class="detail-head">
        <img :src="anchor.avatar" alt="" />
        <button @click="followed = !followed">{{ followed ? "UnFollow" : "Follow" }}</button>
      </div>
      <h2>{{ anchor.nickname }} <img class="flag" :src="countryFlag(anchor.region)" alt="" /></h2>
      <p class="idline"><span class="dot online"></span> Online · ID: {{ anchor.id }}</p>
      <div class="info-chips">
        <span>Gender<br /><b>Female</b></span>
        <span>Age<br /><b>{{ anchor.age }}</b></span>
        <span>Followers<br /><b>{{ anchor.followers }}</b></span>
      </div>
      <h3>Bio</h3>
      <p>{{ anchor.intro }}</p>
      <h3>Moment</h3>
      <div class="mini-gallery">
        <img v-for="item in userMoments.slice(0, 3)" :key="item.id" :src="item.images[0]" alt="" @click="router.push(`/user-dynamic-list/${anchor.id}`)" />
      </div>
      <h3>Profile</h3>
      <div class="tag-row"><span v-for="tag in anchor.tags" :key="tag">{{ tag }}</span></div>
      <button class="stream-preview" @click="router.push(`/live/${anchor.id}`)">▶ Watch live preview</button>
      <h3>Gifts</h3>
      <div class="gift-strip">
        <span>🌹 x120</span>
        <span>💎 x18</span>
        <span>👑 x6</span>
      </div>
    </div>
    <div class="detail-actions">
        <button @click="router.push(`/chat/${anchor.id}`)">💬</button>
        <button class="video" @click="router.push(`/call/${anchor.id}`)">📹 {{ anchor.price }}/min</button>
      </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useCall } from "../composables/useCall";
import { eveMockApi } from "../services/eveMockApi";
import { countryFlag } from "../utils/assets";

const route = useRoute();
const router = useRouter();
const { openCall } = useCall();
const followed = ref(false);
const showActions = ref(false);
const anchor = computed(() => eveMockApi.getAnchor(Number(route.params.id))).value;
const userMoments = eveMockApi.getUserMoments(anchor.id);
</script>
