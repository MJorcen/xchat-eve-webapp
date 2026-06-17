<template>
  <section class="page with-tab mine-page">
    <button class="edit" @click="router.push('/edit-profile')">✎ Edit</button>
    <div class="profile-hero">
      <img :src="user.avatar" alt="" />
      <div>
        <h2>{{ user.nickname }}</h2>
        <p>ID: {{ user.id }}</p>
      </div>
    </div>
    <div class="stats">
      <button @click="router.push('/follow-and-fans?type=following')"><strong>{{ user.following }}</strong><span>Following</span></button>
      <button @click="router.push('/follow-and-fans?type=followers')"><strong>{{ user.followers }}</strong><span>Followers</span></button>
    </div>
    <button class="coin-card" @click="router.push('/wallet')">
      <span>My coins:</span>
      <strong>{{ user.coins }}</strong>
    </button>
    <button class="vip-card" @click="router.push('/sign-detail')">Become <b>VIP</b><span>Get 600 coins</span></button>
    <nav class="settings-list">
      <button @click="router.push('/block-list')"><span>🚫 Block List</span><i>›</i></button>
      <button @click="router.push('/feedback')"><span>💬 Feedback</span><i>›</i></button>
      <button><span>⚙ Clear Cache</span><i>›</i></button>
    </nav>
  </section>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { eveMockApi } from "../services/eveMockApi";

const router = useRouter();
const user = eveMockApi.getCurrentUser();
</script>
