<template>
  <article class="chat-row" @click="clickable ? router.push(`/chat/${conversation.id}`) : undefined">
    <img :src="conversation.user.avatar" alt="" />
    <div>
      <strong>{{ conversation.user.nickname }}</strong>
      <span>{{ conversation.text }}</span>
    </div>
    <aside>
      <time>{{ conversation.time }}</time>
      <b v-if="conversation.unread">{{ conversation.unread }}</b>
    </aside>
  </article>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import type { Conversation } from "../types/eve";

withDefaults(defineProps<{ conversation: Conversation; clickable?: boolean }>(), {
  clickable: true
});

const router = useRouter();
</script>
