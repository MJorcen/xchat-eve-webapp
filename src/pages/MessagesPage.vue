<template>
  <section class="page with-tab">
    <div class="segment left">
      <button :class="{ active: tab === 'message' }" @click="tab = 'message'">Message</button>
      <button :class="{ active: tab === 'call' }" @click="tab = 'call'">Call</button>
    </div>

    <template v-if="tab === 'message'">
      <div class="notice-row" @click="router.push('/notifications')">
        <img src="/assets/eve/messages/noticeNew.png" alt="" />
        <div>
          <strong>Notifications</strong>
          <span>No new notifications</span>
        </div>
      </div>
      <div class="notice-row" @click="router.push('/visitors')">
        <img src="/assets/eve/messages/eyes.png" alt="" />
        <div>
          <strong>Visitors</strong>
          <span>Have new visitors!</span>
        </div>
      </div>
      <ChatRow v-for="chat in conversations" :key="chat.id" :conversation="chat" />
    </template>

    <template v-else>
      <article v-for="call in calls" :key="call.id" class="chat-row">
        <img :src="call.user.avatar" alt="" />
        <div>
          <strong>{{ call.user.nickname }}</strong>
          <span>[Video call: {{ call.duration }}]</span>
          <small>{{ call.time }}</small>
        </div>
        <button class="round-action" @click="openCall(call.user)">📹</button>
      </article>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import ChatRow from "../components/ChatRow.vue";
import { useCall } from "../composables/useCall";
import { eveMockApi } from "../services/eveMockApi";

const router = useRouter();
const { openCall } = useCall();
const tab = ref<"message" | "call">("message");
const conversations = eveMockApi.getConversations();
const calls = eveMockApi.getCalls();
</script>
