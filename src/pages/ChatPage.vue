<template>
  <section class="chat">
    <!-- 头部 -->
    <header class="nav">
      <button class="back" @click="router.back()">
        <van-icon name="arrow-left" />
      </button>
      <div class="title" @click="goAnchor">
        <img class="nav-avatar" :src="anchor?.avatar" alt="" />
        <div class="nav-text">
          <strong>{{ anchor?.nickname }}</strong>
          <span class="status" :class="statusClass">{{ statusText }}</span>
        </div>
      </div>
      <button class="follow" :class="{ on: followed }" @click="toggleFollow">
        {{ followed ? "Following" : "Follow" }}
      </button>
      <button class="more" @click="showActions = true">
        <van-icon name="ellipsis" />
      </button>
    </header>

    <!-- 金币条 -->
    <div class="coin-bar">
      <span class="coins">
        <img src="/assets/eve/chatRoom/coin_16@2x.png" alt="" />{{ coins }}
      </span>
      <button class="recharge" @click="router.push('/recharge')">Recharge</button>
    </div>

    <!-- 消息区 -->
    <div ref="scroller" class="msg-area">
      <div v-if="anchor" class="intro-card" @click="goAnchor">
        <img class="intro-avatar" :src="anchor.avatar" alt="" />
        <div class="intro-info">
          <div class="intro-name">
            {{ anchor.nickname }}
            <span class="age">♀ {{ anchor.age }}</span>
          </div>
          <p class="intro-text">{{ anchor.intro }}</p>
        </div>
      </div>

      <template v-for="m in messages" :key="m.id">
        <!-- 系统消息 -->
        <div v-if="m.type === 'system'" class="system">
          <span v-if="m.date" class="day">{{ m.date }}</span>
          <span class="sys-text">{{ m.text }}</span>
        </div>

        <!-- 普通消息行 -->
        <div v-else class="row" :class="{ mine: m.outgoing }">
          <img v-if="!m.outgoing" class="row-avatar" :src="anchor?.avatar" alt="" />
          <div class="row-body">
            <!-- 文本 -->
            <template v-if="m.type === 'text'">
              <div class="bubble" :class="m.outgoing ? 'mine' : 'other'">
                {{ m.showTranslation && m.translatedText ? m.translatedText : m.text }}
              </div>
              <button v-if="!m.outgoing" class="translate" @click="toggleTranslate(m)">
                <img src="/assets/eve/chatRoom/icon_translate@2x.png" alt="" />
                {{ m.showTranslation ? "Hide translation" : "See translation" }}
              </button>
            </template>

            <!-- 图片 -->
            <div v-else-if="m.type === 'image'" class="img-bubble" @click="preview(m.image)">
              <img :src="m.image" alt="" />
            </div>

            <!-- 礼物 -->
            <div v-else-if="m.type === 'gift'" class="gift-bubble" :class="{ mine: m.outgoing }">
              <span class="gift-face">{{ m.gift?.icon }}</span>
              <div class="gift-info">
                <strong>{{ m.gift?.name }} <i class="x">×{{ m.gift?.count }}</i></strong>
                <span class="gift-coins">
                  <img src="/assets/eve/chatRoom/coin_16@2x.png" alt="" />{{ (m.gift?.price || 0) * (m.gift?.count || 1) }}
                </span>
              </div>
            </div>

            <!-- 语音 -->
            <button v-else-if="m.type === 'voice'" class="voice-bubble" :class="m.outgoing ? 'mine' : 'other'" @click="playVoice(m)">
              <img :src="m.playing ? '/assets/eve/chatRoom/saying.gif' : '/assets/eve/chatRoom/ic_voice.png'" alt="" />
              {{ m.duration }}″
            </button>

            <!-- 通话记录 -->
            <div v-else-if="m.type === 'call'" class="call-bubble" :class="m.outgoing ? 'mine' : 'other'">
              <img src="/assets/eve/chatRoom/ic_video-off@2x.png" alt="" />
              <span :class="{ canceled: m.callStatus === 'canceled' }">
                {{ m.callStatus === "canceled" ? "Canceled" : `Video call ${fmtDur(m.duration || 0)}` }}
              </span>
            </div>
          </div>
        </div>
      </template>

      <div class="spacer" />
    </div>

    <!-- 输入栏 -->
    <footer class="input-bar">
      <div class="input-row">
        <input v-model="draft" class="field" placeholder="Say something…" @keyup.enter="handleSend" />
        <button class="send" @click="handleSend">
          <img src="/assets/eve/chatRoom/ic_send@2x.png" alt="" />
        </button>
      </div>
      <div class="tool-row">
        <button @click="pickPhoto">
          <img src="/assets/eve/chatRoom/ic_photo_44@2x.png" alt="" />
        </button>
        <button @click="sendVoice">
          <img src="/assets/eve/chatRoom/ic_mic_44.png" alt="" />
        </button>
        <button @click="startCall">
          <img src="/assets/eve/chatRoom/ic_video_fill@2x.png" alt="" />
        </button>
        <button @click="showGift = true">
          <img src="/assets/eve/chatRoom/ic_gift@2x.png" alt="" />
        </button>
      </div>
    </footer>

    <input ref="fileInput" type="file" accept="image/*" hidden @change="onFile" />

    <GiftPanel v-model:show="showGift" :anchor="anchor" @sent="onGiftSent" />

    <van-action-sheet
      v-model:show="showActions"
      :actions="[{ name: 'Report' }, { name: 'Block' }]"
      cancel-text="Cancel"
      close-on-click-action
      @select="onAction"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { showImagePreview, showToast } from "vant";
import emitter from "../common/eventBus";
import { api } from "../services/api";
import { useCall } from "../composables/useCall";
import { useUserStore } from "../stores";
import GiftPanel from "../components/GiftPanel.vue";
import type { Anchor, ChatMessage, Gift } from "../types/eve";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { startOutgoing } = useCall();

const id = Number(route.params.id);
const anchor = ref<Anchor | null>(null);
const messages = ref<ChatMessage[]>([]);
const draft = ref("");
const followed = ref(false);
const showGift = ref(false);
const showActions = ref(false);
const scroller = ref<HTMLElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

let nextId = 1000;
const timers: number[] = [];

const coins = computed(() => userStore.coins);
const statusText = computed(() => {
  if (!anchor.value) return "";
  return anchor.value.online && anchor.value.onDuty ? "Online" : anchor.value.onDuty ? "Busy" : "Offline";
});
const statusClass = computed(() => {
  if (!anchor.value) return "";
  return anchor.value.online && anchor.value.onDuty ? "online" : anchor.value.onDuty ? "busy" : "offline";
});

const replyPool = ["Hi 👋", "Are you there?", "Miss you~", "😊", "Tell me more", "Let's video chat tonight"];

function fmtDur(sec: number) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function scrollToBottom() {
  nextTick(() => {
    const el = scroller.value;
    if (el) el.scrollTop = el.scrollHeight;
  });
}

function push(msg: Omit<ChatMessage, "id">) {
  messages.value.push({ id: nextId++, ...msg });
  scrollToBottom();
}

function scheduleReply() {
  const t = window.setTimeout(() => {
    const text = replyPool[Math.floor(Math.random() * replyPool.length)];
    push({ type: "text", outgoing: false, time: nowTime(), text });
  }, 1400 + Math.random() * 1200);
  timers.push(t);
}

function handleSend() {
  const text = draft.value.trim();
  if (!text) return;
  push({ type: "text", outgoing: true, time: nowTime(), text });
  draft.value = "";
  scheduleReply();
}

async function toggleTranslate(m: ChatMessage) {
  if (!m.translatedText) {
    const res = await api.translate(m.text || "");
    m.translatedText = res.text;
  }
  m.showTranslation = !m.showTranslation;
}

function pickPhoto() {
  fileInput.value?.click();
}

function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  push({ type: "image", outgoing: true, time: nowTime(), image: URL.createObjectURL(file) });
  (e.target as HTMLInputElement).value = "";
  scheduleReply();
}

function sendVoice() {
  const duration = 1 + Math.floor(Math.random() * 6);
  push({ type: "voice", outgoing: true, time: nowTime(), duration });
}

function playVoice(m: ChatMessage) {
  if (m.playing) return;
  m.playing = true;
  const t = window.setTimeout(() => (m.playing = false), (m.duration || 2) * 1000);
  timers.push(t);
}

function onGiftSent({ gift, count }: { gift: Gift; count: number }) {
  push({
    type: "gift",
    outgoing: true,
    time: nowTime(),
    gift: { name: gift.name, icon: gift.icon, price: gift.price, count }
  });
}

function startCall() {
  if (!anchor.value) return;
  startOutgoing(anchor.value);
  router.push(`/call/${id}`);
}

function goAnchor() {
  router.push(`/anchor/${id}`);
}

function toggleFollow() {
  followed.value = !followed.value;
  showToast(followed.value ? "Followed" : "Unfollowed");
}

function onAction(action: { name: string }) {
  showToast(`${action.name}ed`);
}

function preview(img?: string) {
  if (img) showImagePreview([img]);
}

// 实时：对方新消息 / 通话结束记录
function onMessage(p: { fromId: number; text: string }) {
  if (p.fromId === id) push({ type: "text", outgoing: false, time: nowTime(), text: p.text });
}
function onHangup(p: { anchor: Anchor; duration: number }) {
  if (p.anchor.id === id) {
    push({
      type: "call",
      outgoing: true,
      time: nowTime(),
      duration: p.duration,
      callStatus: p.duration > 0 ? "answered" : "canceled"
    });
  }
}

onMounted(async () => {
  const [a, list] = await Promise.all([api.getAnchor(id), api.getChatMessages(id)]);
  anchor.value = a;
  messages.value = list;
  scrollToBottom();
  emitter.on("message:new", onMessage);
  emitter.on("call:hangup", onHangup);
});

onUnmounted(() => {
  timers.forEach((t) => window.clearTimeout(t));
  emitter.off("message:new", onMessage);
  emitter.off("call:hangup", onHangup);
});
</script>

<style scoped lang="scss">
.chat {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #2c1a1a;
}

.nav {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #2c1a1a;
  border-bottom: 1px solid #241213;

  .back,
  .more {
    color: #fff;
    font-size: 20px;
    flex: 0 0 auto;
  }
  .title {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .nav-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    object-fit: cover;
  }
  .nav-text {
    min-width: 0;
    strong {
      display: block;
      font-size: 15px;
      color: #fff;
    }
    .status {
      font-size: 11px;
      &.online {
        color: #00e397;
      }
      &.busy {
        color: #ffd36e;
      }
      &.offline {
        color: #9a8b8b;
      }
    }
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

.coin-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px;
  background: #241213;

  .coins {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 13px;
    color: #ffd36e;
    img {
      width: 16px;
      height: 16px;
    }
  }
  .recharge {
    padding: 4px 14px;
    border-radius: 12px;
    background: linear-gradient(90deg, #ff5473, #eb6300);
    color: #fff;
    font-size: 12px;
  }
}

.msg-area {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.intro-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  margin-bottom: 14px;
  background: #3a2526;
  border-radius: 16px;

  .intro-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: cover;
    flex: 0 0 auto;
  }
  .intro-name {
    font-size: 15px;
    font-weight: 600;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 6px;
    .age {
      font-size: 11px;
      color: #fff;
      background: #ff5473;
      padding: 1px 7px;
      border-radius: 10px;
    }
  }
  .intro-text {
    margin-top: 4px;
    font-size: 12px;
    color: #9a8b8b;
    line-height: 1.4;
  }
}

.system {
  text-align: center;
  margin: 12px 0;
  .day {
    display: block;
    font-size: 11px;
    color: #9a8b8b;
    margin-bottom: 8px;
  }
  .sys-text {
    font-size: 12px;
    color: #9a8b8b;
  }
}

.row {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;

  &.mine {
    flex-direction: row-reverse;
  }
  .row-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
    flex: 0 0 auto;
  }
  .row-body {
    max-width: 72%;
    display: flex;
    flex-direction: column;
  }
  &.mine .row-body {
    align-items: flex-end;
  }
}

.bubble {
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.4;
  word-break: break-word;

  &.other {
    background: #3a2526;
    color: #fff;
    border-top-left-radius: 4px;
  }
  &.mine {
    background: #eb6300;
    color: #fff;
    border-top-right-radius: 4px;
  }
}

.translate {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 5px;
  font-size: 11px;
  color: #ffd36e;
  img {
    width: 14px;
    height: 14px;
  }
}

.img-bubble {
  img {
    max-width: 160px;
    border-radius: 12px;
    display: block;
  }
}

.gift-bubble {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 16px;
  background: #3a2526;

  &.mine {
    flex-direction: row-reverse;
    background: linear-gradient(135deg, #ff5473, #eb6300);
  }
  .gift-face {
    font-size: 32px;
  }
  .gift-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
    strong {
      font-size: 14px;
      color: #fff;
      .x {
        color: #ffe1e8;
        font-style: normal;
      }
    }
    .gift-coins {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 12px;
      color: #ffd36e;
      img {
        width: 12px;
        height: 12px;
      }
    }
  }
}

.voice-bubble {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 16px;
  font-size: 13px;
  color: #fff;
  img {
    width: 18px;
    height: 18px;
  }
  &.other {
    background: #3a2526;
  }
  &.mine {
    background: #eb6300;
    flex-direction: row-reverse;
  }
}

.call-bubble {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 16px;
  font-size: 13px;
  color: #fff;
  img {
    width: 18px;
    height: 18px;
  }
  &.other {
    background: #3a2526;
  }
  &.mine {
    background: #eb6300;
    flex-direction: row-reverse;
  }
  .canceled {
    color: #ffd0d8;
  }
}

.spacer {
  height: 12px;
}

.input-bar {
  flex: 0 0 auto;
  padding: 8px 16px calc(8px + env(safe-area-inset-bottom));
  background: #3a2526;
  border-top: 1px solid #241213;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 10px;

  .field {
    flex: 1;
    height: 40px;
    padding: 0 16px;
    border-radius: 20px;
    background: #2c1a1a;
    color: #fff;
    font-size: 14px;
    border: none;
    outline: none;
    &::placeholder {
      color: #9a8b8b;
    }
  }
  .send img {
    width: 36px;
    height: 36px;
  }
}

.tool-row {
  display: flex;
  justify-content: space-around;
  padding-top: 10px;

  button img {
    width: 28px;
    height: 28px;
  }
}
</style>
