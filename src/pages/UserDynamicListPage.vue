<template>
  <section class="page">
    <TopBar :title="user?.nickname || 'Moment'" />

    <div v-if="user" class="profile">
      <van-image round fit="cover" class="avatar" :src="user.avatar" lazy-load />
      <div class="info">
        <div class="name-row">
          <strong>{{ user.nickname }}</strong>
          <img class="flag" :src="countryFlag(user.region)" alt="" />
        </div>
        <span class="id">ID: {{ user.id }}</span>
        <span class="sub">{{ user.region.toUpperCase() }} · {{ user.age }} · {{ user.followers }} followers</span>
      </div>
      <button class="follow" :class="{ on: followed }" @click="followed = !followed">
        {{ followed ? "Following" : "+ Follow" }}
      </button>
    </div>

    <div v-if="moments.length" class="feed">
      <MomentCard v-for="m in moments" :key="m.id" :moment="m" />
    </div>
    <EmptyState v-else text="No moments yet" />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import MomentCard from "../components/MomentCard.vue";
import TopBar from "../components/TopBar.vue";
import EmptyState from "../components/EmptyState.vue";
import { api } from "../services/api";
import { countryFlag } from "../utils/assets";
import type { Anchor, Moment } from "../types/eve";

const route = useRoute();
const id = Number(route.params.id);
const user = ref<Anchor | null>(null);
const moments = ref<Moment[]>([]);
const followed = ref(false);

onMounted(async () => {
  [user.value, moments.value] = await Promise.all([api.getAnchor(id), api.getUserMoments(id)]);
});
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding-bottom: 84px;
  background: #2c1a1a;
}
.profile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #3a2526;
  border-bottom: 8px solid #241213;
  .avatar {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    overflow: hidden;
    flex: 0 0 auto;
  }
  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .name-row {
    display: flex;
    align-items: center;
    gap: 6px;
    strong {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
    }
    .flag {
      width: 18px;
      height: 13px;
      border-radius: 2px;
    }
  }
  .id,
  .sub {
    font-size: 12px;
    color: #9a8b8b;
  }
  .follow {
    flex: 0 0 auto;
    height: 28px;
    padding: 0 14px;
    border-radius: 14px;
    font-size: 12px;
    font-weight: 600;
    color: #fff;
    background: #eb6300;
    &.on {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.4);
      color: #c8bcbc;
    }
  }
}
</style>
