<template>
  <section class="messages">
    <header class="top-tabs">
      <button :class="['top-tab', { active: tab === 'message' }]" @click="tab = 'message'">
        Message<span class="underline" />
      </button>
      <button :class="['top-tab', { active: tab === 'call' }]" @click="tab = 'call'">
        Call<span class="underline" />
      </button>
    </header>

    <template v-if="tab === 'message'">
      <div class="entries">
        <button class="entry" @click="router.push('/notifications')">
          <img src="/assets/eve/messages/noticeNew.png" alt="" />
          <div class="entry-text">
            <strong>Notifications</strong>
            <span>No new notifications</span>
          </div>
        </button>
        <button class="entry" @click="router.push('/visitors')">
          <img src="/assets/eve/messages/eyes.png" alt="" />
          <div class="entry-text">
            <strong>Visitors</strong>
            <span>You have new visitors!</span>
          </div>
        </button>
      </div>

      <div class="list">
        <ChatRow v-for="chat in conversations" :key="chat.id" :conversation="chat" />
      </div>
    </template>

    <template v-else>
      <div class="list">
        <article v-for="call in calls" :key="call.id" class="call-row" @click="router.push(`/chat/${call.user.id}`)">
          <van-image round fit="cover" class="avatar" :src="call.user.avatar" lazy-load />
          <div class="body">
            <strong class="name">{{ call.user.nickname }}</strong>
            <span class="sub"><span class="vi">📹</span> Video call · {{ call.duration }}</span>
            <small class="time">{{ call.time }}</small>
          </div>
          <button class="call-btn" @click.stop="openCall(call.user)">
            <img src="/assets/eve/messages/ic_video@2x.png" alt="" />
          </button>
        </article>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import ChatRow from "../components/ChatRow.vue";
import { useCall } from "../composables/useCall";
import emitter from "../common/eventBus";
import { api } from "../services/api";
import type { CallRecord, Conversation } from "../types/eve";

const router = useRouter();
const { openCall } = useCall();
const tab = ref<"message" | "call">("message");
const conversations = ref<Conversation[]>([]);
const calls = ref<CallRecord[]>([]);

// 模拟服务端推送：新消息落到对应会话，递增未读并更新最后一条
function onMessage(p: { fromId: number; text: string }) {
  const c = conversations.value.find((item) => item.user.id === p.fromId);
  if (c) {
    c.unread += 1;
    c.text = p.text;
  }
}

onMounted(async () => {
  [conversations.value, calls.value] = await Promise.all([api.getConversations(), api.getCalls()]);
  emitter.on("message:new", onMessage);
});

onUnmounted(() => emitter.off("message:new", onMessage));
</script>

<style scoped lang="scss">
.messages {
  min-height: 100vh;
  padding-bottom: 84px;
  background: #2c1a1a;
}

.top-tabs {
  position: sticky;
  top: 0;
  z-index: 19;
  display: flex;
  align-items: flex-end;
  gap: 22px;
  padding: calc(14px + env(safe-area-inset-top)) 16px 12px;
  background: #2c1a1a;
}

.top-tab {
  position: relative;
  font-size: 18px;
  font-weight: 700;
  color: #888;

  .underline {
    position: absolute;
    left: 0;
    right: 0;
    bottom: -7px;
    height: 3px;
    border-radius: 3px;
    background: transparent;
  }

  &.active {
    font-size: 21px;
    color: #eb6300;
    .underline {
      background: #eb6300;
    }
  }
}

.entries {
  display: flex;
  gap: 12px;
  padding: 6px 16px 10px;
}

.entry {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #3a2526;
  border-radius: 14px;
  text-align: left;

  img {
    width: 36px;
    height: 36px;
    object-fit: contain;
  }
}

.entry-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  strong {
    font-size: 13px;
    color: #fff;
  }
  span {
    font-size: 11px;
    color: #9a8b8b;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.list {
  padding-top: 4px;
}

.call-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;

  .avatar {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    overflow: hidden;
    flex: 0 0 auto;
  }
  .body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .name {
    font-size: 15px;
    font-weight: 600;
    color: #fff;
  }
  .sub {
    font-size: 12px;
    color: #9a8b8b;
  }
  .time {
    font-size: 11px;
    color: #7d6a6a;
  }
  .call-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #3a2526;
    display: grid;
    place-items: center;
    img {
      width: 22px;
      height: 22px;
    }
  }
}
</style>
