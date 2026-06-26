<template>
  <article class="chat-row" :class="{ clickable }" @click="onClick">
    <div class="avatar-wrap">
      <van-image round fit="cover" class="avatar" :src="conversation.user.avatar" lazy-load />
      <span v-if="conversation.user.online" class="online-dot" />
    </div>
    <div class="body">
      <strong class="name">{{ conversation.user.nickname }}</strong>
      <span class="last">{{ conversation.text }}</span>
    </div>
    <aside class="meta">
      <time class="time">{{ conversation.time }}</time>
      <b v-if="conversation.unread" class="badge">{{ conversation.unread }}</b>
    </aside>
  </article>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import type { Conversation } from "../types/eve";

const props = withDefaults(defineProps<{ conversation: Conversation; clickable?: boolean }>(), {
  clickable: true
});

const router = useRouter();

function onClick() {
  if (props.clickable) router.push(`/chat/${props.conversation.id}`);
}
</script>

<style scoped lang="scss">
.chat-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;

  &.clickable {
    cursor: pointer;
    &:active {
      background: rgba(255, 255, 255, 0.04);
    }
  }
}

.avatar-wrap {
  position: relative;
  flex: 0 0 auto;
}

.avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  overflow: hidden;
}

.online-dot {
  position: absolute;
  right: 1px;
  bottom: 1px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #00e397;
  border: 2px solid #2c1a1a;
}

.body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.name {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
}

.last {
  font-size: 13px;
  color: #9a8b8b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.time {
  font-size: 11px;
  color: #7d6a6a;
}

.badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #ff5473;
  color: #fff;
  font-size: 11px;
  display: grid;
  place-items: center;
}
</style>
