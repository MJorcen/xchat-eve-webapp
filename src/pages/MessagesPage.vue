<template>
  <section class="messages">
    <header class="top-tabs">
      <button :class="['top-tab', { active: tab === 'message' }]" @click="tab = 'message'">
        {{ t("messages.message") }}<span class="underline" />
      </button>
      <button :class="['top-tab', { active: tab === 'call' }]" @click="tab = 'call'">
        {{ t("messages.call") }}<span class="underline" />
      </button>
    </header>

    <AppSkeleton v-if="loading" type="list" />

    <template v-else-if="tab === 'message'">
      <!-- 直播入口 -->
      <button v-if="lives.length" class="live-entry" @click="router.push(`/live/${lives[0].id}`)">
        <span class="live-badge"><i class="d" />LIVE</span>
        <div class="live-text">
          <strong>{{ t("messages.liveStreaming") }}</strong>
          <span>{{ t("messages.liveOnline", { n: lives.length }) }}</span>
        </div>
        <div class="live-avatars">
          <van-image v-for="r in lives.slice(0, 3)" :key="r.id" round fit="cover" class="la" :src="r.anchor.avatar" lazy-load />
        </div>
      </button>

      <div class="entries">
        <button class="entry" @click="router.push('/notifications')">
          <img src="/assets/eve/messages/noticeNew.png" alt="" />
          <div class="entry-text">
            <strong>{{ t("messages.notifications") }}</strong>
            <span>{{ t("messages.noNew") }}</span>
          </div>
        </button>
        <button class="entry" @click="router.push('/visitors')">
          <img src="/assets/eve/messages/eyes.png" alt="" />
          <div class="entry-text">
            <strong>{{ t("messages.visitors") }}</strong>
            <span>{{ t("messages.newVisitors") }}</span>
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
            <Video :size="22" :stroke-width="2" />
          </button>
        </article>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { Video } from "lucide-vue-next";
import ChatRow from "../components/ChatRow.vue";
import AppSkeleton from "../components/AppSkeleton.vue";
import { useCall } from "../composables/useCall";
import { useI18n } from "vue-i18n";
import emitter from "../common/eventBus";
import { api } from "../services/api";
import type { CallRecord, Conversation, LiveRoom } from "../types/eve";

defineOptions({ name: "MessagesPage" });

const { t } = useI18n();
const router = useRouter();
const { openCall } = useCall();
const tab = ref<"message" | "call">("message");
const loading = ref(true);
const conversations = ref<Conversation[]>([]);
const calls = ref<CallRecord[]>([]);
const lives = ref<LiveRoom[]>([]);

// 模拟服务端推送：新消息落到对应会话，递增未读并更新最后一条
function onMessage(p: { fromId: number; text: string }) {
  const c = conversations.value.find((item) => item.user.id === p.fromId);
  if (c) {
    c.unread += 1;
    c.text = p.text;
  }
}

onMounted(async () => {
  [conversations.value, calls.value, lives.value] = await Promise.all([
    api.getConversations(),
    api.getCalls(),
    api.getLiveRooms()
  ]);
  loading.value = false;
  emitter.on("message:new", onMessage);
});

onUnmounted(() => emitter.off("message:new", onMessage));
</script>

<style scoped lang="scss">
.messages {
  height: 100vh;
  overflow-y: auto;
  padding-bottom: 84px;
  background: var(--eve-bg);
}

.top-tabs {
  position: sticky;
  top: 0;
  z-index: 19;
  display: flex;
  align-items: flex-end;
  gap: 22px;
  padding: calc(14px + env(safe-area-inset-top)) 16px 12px;
  background: var(--eve-bg);
}

.top-tab {
  position: relative;
  font-size: 18px;
  font-weight: 800;
  color: var(--eve-faint);

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
    color: #fff;
    .underline {
      background: var(--eve-grad);
      box-shadow: var(--eve-glow-pink);
    }
  }
}

.live-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  width: calc(100% - 32px);
  margin: 6px 16px 4px;
  padding: 12px 12px;
  border-radius: 16px;
  background: linear-gradient(120deg, #2a1940, #3b1230);
  border: 1px solid var(--eve-line);

  .live-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0 8px;
    height: 20px;
    border-radius: 999px;
    font-size: 9px;
    font-weight: 800;
    color: #fff;
    background: var(--eve-grad);
    flex: 0 0 auto;
    .d {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #fff;
      animation: blink 1.2s ease-in-out infinite;
    }
  }
  .live-text {
    flex: 1;
    min-width: 0;
    text-align: left;
    strong {
      display: block;
      font-size: 14px;
      font-weight: 700;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    span {
      display: block;
      font-size: 11px;
      color: var(--eve-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
  .live-avatars {
    display: flex;
    flex: 0 0 auto;
    .la {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      overflow: hidden;
      border: 1.5px solid var(--eve-bg);
      & + .la {
        margin-left: -7px;
      }
    }
  }
  .arrow {
    color: var(--eve-faint);
    flex: 0 0 auto;
  }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

.entries {
  display: flex;
  gap: 12px;
  padding: 8px 16px 10px;
}

.entry {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: var(--eve-surface);
  border: 1px solid var(--eve-line);
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
    color: var(--eve-faint);
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
    color: var(--eve-faint);
  }
  .time {
    font-size: 11px;
    color: var(--eve-faint);
  }
  .call-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    color: #fff;
    background: var(--eve-grad);
    box-shadow: var(--eve-glow-pink);
    display: grid;
    place-items: center;
  }
}
</style>
