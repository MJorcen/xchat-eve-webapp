<template>
  <Transition name="drop">
    <button v-if="current" class="top-noti" @click="tap">
      <img class="avatar" :src="current.avatar" alt="" />
      <div class="body">
        <strong>{{ current.title }}</strong>
        <span>{{ current.text }}</span>
      </div>
      <van-icon name="arrow" class="arrow" />
    </button>
  </Transition>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import emitter from "../common/eventBus";
import { api } from "../services/api";
import { useCall } from "../composables/useCall";
import type { Anchor, Gift } from "../types/eve";

const route = useRoute();
const router = useRouter();
const { callState } = useCall();

type Banner = { avatar: string; title: string; text: string; to?: string };
const current = ref<Banner | null>(null);

let anchors: Anchor[] = [];
let gifts: Gift[] = [];
let hideTimer: number | null = null;
let lastAt = 0;

function show(b: Banner) {
  // 通话(来电/拨号/通话中)期间不打扰,避免横幅压在/残留在 CallModal 之上
  if (callState.phase !== "idle" && callState.phase !== "ended") return;
  const now = Date.now();
  // 同时只显示一条,且最短间隔 6s,避免刷屏
  if (current.value || now - lastAt < 6000) return;
  lastAt = now;
  current.value = b;
  if (hideTimer) window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => (current.value = null), 3400);
}

function onMessage(p: { fromId: number; text: string }) {
  // 已经在对应聊天页 / 消息列表则不打扰(按路由参数精确匹配,避免 id 前缀误命中)
  if ((route.name === "Chat" && Number(route.params.id) === p.fromId) || route.path === "/messages") return;
  const a = anchors.find((x) => x.id === p.fromId);
  if (a) show({ avatar: a.avatar, title: a.nickname, text: p.text, to: `/chat/${a.id}` });
}

function onGift(p: { fromId: number; giftId: number; count: number }) {
  const a = anchors.find((x) => x.id === p.fromId);
  const g = gifts.find((x) => x.id === p.giftId);
  if (a && g) show({ avatar: a.avatar, title: a.nickname, text: `sent you ${g.icon} ${g.name}`, to: `/anchor/${a.id}` });
}

function tap() {
  const to = current.value?.to;
  current.value = null;
  if (to) router.push(to);
}

onMounted(async () => {
  [anchors, gifts] = await Promise.all([api.getAnchors(), api.getGifts()]);
  emitter.on("message:new", onMessage);
  emitter.on("gift:received", onGift);
});

onUnmounted(() => {
  emitter.off("message:new", onMessage);
  emitter.off("gift:received", onGift);
  if (hideTimer) window.clearTimeout(hideTimer);
});
</script>

<style scoped>
.top-noti {
  position: fixed;
  top: calc(env(safe-area-inset-top) + 8px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 9900;
  width: calc(min(400PX, 100vw) - 24px);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 16px;
  background: rgba(58, 37, 38, 0.96);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  text-align: left;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex: 0 0 auto;
}

.body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.body strong {
  font-size: 14px;
  color: #fff;
}
.body span {
  font-size: 12px;
  color: var(--eve-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.arrow {
  color: var(--eve-faint);
  flex: 0 0 auto;
}

.drop-enter-active,
.drop-leave-active {
  transition: all 0.32s cubic-bezier(0.2, 0.8, 0.3, 1);
}
.drop-enter-from,
.drop-leave-to {
  opacity: 0;
  transform: translate(-50%, -120%);
}
</style>
