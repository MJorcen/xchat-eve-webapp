<template>
  <section class="page list-page">
    <TopBar :title="title" />

    <template v-if="listType === 'notifications'">
      <article v-for="item in notifications" :key="item.id" class="plain-row">
        <div class="icon-box">🔔</div>
        <div>
          <strong>{{ item.title }}</strong>
          <span>{{ item.content }}</span>
        </div>
        <time>{{ item.time }}</time>
      </article>
    </template>

    <template v-else-if="['visitors', 'blocked', 'following'].includes(listType)">
      <article v-for="user in users" :key="user.id" class="chat-row">
        <img :src="user.avatar" alt="" />
        <div>
          <strong>{{ user.nickname }}</strong>
          <span>{{ user.online ? "Online" : "Offline" }} · {{ user.age }}</span>
        </div>
        <button class="small-pill" @click="router.push(`/anchor/${user.id}`)">View</button>
      </article>
    </template>

    <template v-else-if="listType === 'wallet'">
      <article v-for="item in walletRows" :key="item.id" class="plain-row">
        <div class="icon-box">🪙</div>
        <div>
          <strong>{{ item.title }}</strong>
          <span>{{ item.time }}</span>
        </div>
        <b>{{ item.amount }}</b>
      </article>
    </template>

    <template v-else-if="listType === 'sign'">
      <div class="sign-card">
        <h2>Daily Sign-in</h2>
        <p>Keep checking in to receive bonus coins.</p>
        <div class="sign-grid">
          <span v-for="day in 7" :key="day">Day {{ day }}<b>+{{ day * 20 }}</b></span>
        </div>
        <button class="primary-action">Sign-in</button>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import TopBar from "../components/TopBar.vue";
import { eveMockApi } from "../services/eveMockApi";

const route = useRoute();
const router = useRouter();

const title = computed(() => String(route.meta.title || route.name || "List"));
const listType = computed(() => String(route.meta.listType || "notifications")).value;
const notifications = eveMockApi.getNotifications();
const users = listType === "blocked" ? eveMockApi.getBlockedUsers() : listType === "following" ? eveMockApi.getFollowing() : eveMockApi.getVisitors();
const walletRows = [
  { id: 1, title: "Recharge", time: "2026-06-17 08:20", amount: "+600" },
  { id: 2, title: "Video call", time: "2026-06-16 20:30", amount: "-300" },
  { id: 3, title: "Match", time: "2026-06-16 18:10", amount: "-300" }
];
</script>
