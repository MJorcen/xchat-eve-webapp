<template>
  <section class="page">
    <TopBar title="Notification" />
    <div v-if="items.length" class="list">
      <article v-for="n in items" :key="n.id" class="item">
        <img class="badge" src="/assets/eve/logo.png" alt="" />
        <div class="bubble">
          <strong>{{ n.title }}</strong>
          <p>{{ n.content }}</p>
          <time>{{ n.time }}</time>
        </div>
      </article>
    </div>
    <EmptyState v-else text="No notifications" />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import TopBar from "../components/TopBar.vue";
import EmptyState from "../components/EmptyState.vue";
import { api } from "../services/api";
import type { NotificationItem } from "../types/eve";

const items = ref<NotificationItem[]>([]);
onMounted(async () => (items.value = await api.getNotifications()));
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #2c1a1a;
}
.list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.item {
  display: flex;
  align-items: flex-start;
}
.badge {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex: 0 0 auto;
}
.bubble {
  margin-left: 12px;
  padding: 14px 16px;
  background: #3a2526;
  border-radius: 16px;
  border-top-left-radius: 4px;
  strong {
    font-size: 15px;
    font-weight: 600;
    color: #fff;
  }
  p {
    margin: 6px 0 8px;
    font-size: 14px;
    line-height: 1.5;
    color: #ece4e4;
  }
  time {
    display: block;
    text-align: right;
    font-size: 12px;
    color: #9a8b8b;
  }
}
</style>
