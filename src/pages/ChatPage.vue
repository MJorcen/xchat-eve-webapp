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
        {{ followed ? t("common.following") : t("common.follow") }}
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
      <button class="recharge" @click="router.push('/recharge')">{{ t("common.recharge") }}</button>
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
                {{ m.showTranslation ? t("chat.hideTranslation") : t("chat.seeTranslation") }}
              </button>
            </template>

            <!-- 图片 -->
            <div v-else-if="m.type === 'image'" class="img-bubble" @click="preview(m.image)">
              <img :src="m.image" alt="" />
            </div>

            <!-- 礼物 -->
            <div v-else-if="m.type === 'gift'" class="gift-bubble" :class="{ mine: m.outgoing }">
              <span class="gift-face">
                <img v-if="m.gift?.icon?.startsWith('http')" :src="m.gift.icon" alt="" />
                <template v-else>{{ m.gift?.icon }}</template>
              </span>
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

            <!-- 位置 -->
            <div v-else-if="m.type === 'location'" class="loc-bubble" :class="m.outgoing ? 'mine' : 'other'">
              <div class="loc-map"><MapPin :size="20" :stroke-width="2" /></div>
              <div class="loc-info">
                <strong>{{ m.location?.name }}</strong>
                <span>{{ m.location?.address }}</span>
              </div>
            </div>

            <!-- 通话记录 -->
            <div v-else-if="m.type === 'call'" class="call-bubble" :class="m.outgoing ? 'mine' : 'other'">
              <img src="/assets/eve/chatRoom/ic_video-off@2x.png" alt="" />
              <span :class="{ canceled: m.callStatus === 'canceled' }">
                {{ m.callStatus === "canceled" ? t("chat.canceled") : t("chat.videoCall", { duration: fmtDur(m.duration || 0) }) }}
              </span>
            </div>
          </div>
        </div>
      </template>

      <div class="spacer" />
    </div>

    <!-- 输入栏 -->
    <footer class="input-bar">
      <div class="quick-row">
        <button v-for="q in quickReplies" :key="q" class="quick" @click="sendQuick(q)">{{ q }}</button>
      </div>
      <div class="input-row">
        <input v-model="draft" class="field" :placeholder="t('chat.inputPlaceholder')" @keyup.enter="handleSend" />
        <button class="send" @click="handleSend">
          <img src="/assets/eve/chatRoom/ic_send@2x.png" alt="" />
        </button>
      </div>
      <div class="tool-row">
        <button @click="pickPhoto">
          <img src="/assets/eve/chatRoom/ic_photo_44@2x.png" alt="" />
        </button>
        <button
          class="mic-hold"
          :class="{ recording }"
          @pointerdown="onMicDown"
          @pointerup="onMicUp"
          @pointercancel="onMicUp"
          @pointermove="onMicMove"
        >
          <Mic :size="24" :stroke-width="1.9" />
        </button>
        <button @click="sendLocation">
          <MapPin :size="24" :stroke-width="1.9" />
        </button>
        <button @click="startCall">
          <img src="/assets/eve/chatRoom/ic_video_fill@2x.png" alt="" />
        </button>
        <button @click="showGift = true">
          <img src="/assets/eve/chatRoom/ic_gift@2x.png" alt="" />
        </button>
      </div>
    </footer>

    <!-- 录音浮层 -->
    <div v-if="recording" class="rec-overlay">
      <div class="rec-card" :class="{ cancel: recordCancel }">
        <div class="rec-mic">{{ recordCancel ? "✖" : "🎙" }}</div>
        <div class="rec-secs">{{ recordSecs }}″</div>
        <div class="rec-tip">{{ recordCancel ? t("chat.releaseCancel") : t("chat.swipeUpCancel") }}</div>
      </div>
    </div>

    <input ref="fileInput" type="file" accept="image/*" hidden @change="onFile" />

    <GiftPanel v-model:show="showGift" :anchor="anchor" @sent="onGiftSent" />

    <van-action-sheet
      v-model:show="showActions"
      :actions="actionSheetActions"
      :cancel-text="t('common.cancel')"
      close-on-click-action
      @select="onAction"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { showImagePreview, showToast } from "vant";
import { Mic, MapPin } from "lucide-vue-next";
import emitter from "../common/eventBus";
import { api } from "../services/api";
import { fetchAnchorCard } from "../services/anchor";
import { getMessages, sendText, onMessages } from "../services/im";
import { useCall } from "../composables/useCall";
import { useUserStore } from "../stores";
import GiftPanel from "../components/GiftPanel.vue";
import type { Anchor, ChatMessage, Gift } from "../types/eve";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
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

// 长按录音状态
const recording = ref(false);
const recordSecs = ref(0);
const recordCancel = ref(false);
let recordTimer: number | null = null;
let recordStartY = 0;

let nextId = 1000;
const timers: number[] = [];

const coins = computed(() => userStore.coins);
const statusText = computed(() => {
  if (!anchor.value) return "";
  return anchor.value.online && anchor.value.onDuty
    ? t("chat.statusOnline")
    : anchor.value.onDuty
      ? t("chat.statusBusy")
      : t("chat.statusOffline");
});
const statusClass = computed(() => {
  if (!anchor.value) return "";
  return anchor.value.online && anchor.value.onDuty ? "online" : anchor.value.onDuty ? "busy" : "offline";
});

const replyPool = ["Hi 👋", "Are you there?", "Miss you~", "😊", "Tell me more", "Let's video chat tonight"];
const quickReplies = ["Hi 👋", "How are you?", "You're cute 😍", "Free to call?", "Send me a photo"];

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
  push({ type: "text", outgoing: true, time: nowTime(), text }); // 乐观渲染
  draft.value = "";
  sendText(id, text).catch(() => showToast(t("chat.sendFailed"))); // 真实发送(NIM)
}

function sendQuick(t: string) {
  draft.value = t;
  handleSend();
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

// 按住录音 → 松手发送;上滑取消
function onMicDown(e: PointerEvent) {
  recording.value = true;
  recordSecs.value = 0;
  recordCancel.value = false;
  recordStartY = e.clientY;
  try {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  } catch {
    /* synthetic/edge pointer */
  }
  recordTimer = window.setInterval(() => (recordSecs.value += 1), 1000);
}
function onMicMove(e: PointerEvent) {
  if (!recording.value) return;
  recordCancel.value = recordStartY - e.clientY > 60;
}
function onMicUp() {
  if (!recording.value) return;
  if (recordTimer) {
    window.clearInterval(recordTimer);
    recordTimer = null;
  }
  const secs = Math.max(1, recordSecs.value);
  const cancel = recordCancel.value;
  recording.value = false;
  recordCancel.value = false;
  if (!cancel) {
    push({ type: "voice", outgoing: true, time: nowTime(), duration: secs });
    scheduleReply();
  }
}

function sendLocation() {
  push({
    type: "location",
    outgoing: true,
    time: nowTime(),
    location: { name: t("chat.myLocation"), address: t("chat.locationAddr") }
  });
  scheduleReply();
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
  showToast(followed.value ? t("chat.followed") : t("chat.unfollowed"));
}

const actionSheetActions = computed(() => [
  { name: t("chat.report"), key: "report" },
  { name: t("chat.block"), key: "block" }
]);

function onAction(action: { key?: string }) {
  if (action.key === "report") showToast(t("chat.reported"));
  else if (action.key === "block") showToast(t("chat.blocked"));
}

function preview(img?: string) {
  if (img) showImagePreview([img]);
}

// 通话结束记录(RTC 暂留 mock)
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

let stopMsg: (() => void) | null = null;

onMounted(async () => {
  const [a, list] = await Promise.all([api.getAnchor(id), getMessages(id).catch(() => [] as ChatMessage[])]);
  anchor.value = a;
  messages.value = list;
  scrollToBottom();
  // 真实身份覆盖(昵称/头像)
  fetchAnchorCard(id)
    .then(({ overlay }) => {
      if (anchor.value) anchor.value = { ...anchor.value, ...overlay };
    })
    .catch(() => {});
  // 收到对方真实消息 → 入列
  stopMsg = onMessages((peerId, msg) => {
    if (peerId === id) {
      messages.value.push(msg);
      scrollToBottom();
    }
  });
  emitter.on("call:hangup", onHangup);
});

onUnmounted(() => {
  timers.forEach((t) => window.clearTimeout(t));
  if (recordTimer) window.clearInterval(recordTimer);
  stopMsg?.();
  emitter.off("call:hangup", onHangup);
});
</script>

<style scoped lang="scss">
.chat {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--eve-bg);
}

.nav {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--eve-bg);
  border-bottom: 1px solid var(--eve-line);

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
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    line-height: 1.2;
    strong {
      font-size: 15px;
      font-weight: 700;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .status {
      font-size: 11px;
      &.online {
        color: var(--eve-green);
      }
      &.busy {
        color: var(--eve-gold);
      }
      &.offline {
        color: var(--eve-faint);
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
    background: var(--eve-pink);
    &.on {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.4);
      color: var(--eve-muted);
    }
  }
}

.coin-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px;
  background: var(--eve-line);

  .coins {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 13px;
    color: var(--eve-gold);
    img {
      width: 16px;
      height: 16px;
    }
  }
  .recharge {
    padding: 4px 14px;
    border-radius: 12px;
    background: var(--eve-grad);
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
  background: var(--eve-surface);
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
      background: var(--eve-pink);
      padding: 1px 7px;
      border-radius: 10px;
    }
  }
  .intro-text {
    margin-top: 4px;
    font-size: 12px;
    color: var(--eve-faint);
    line-height: 1.4;
  }
}

.system {
  text-align: center;
  margin: 12px 0;
  .day {
    display: block;
    font-size: 11px;
    color: var(--eve-faint);
    margin-bottom: 8px;
  }
  .sys-text {
    font-size: 12px;
    color: var(--eve-faint);
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
    background: var(--eve-surface);
    color: #fff;
    border-top-left-radius: 4px;
  }
  &.mine {
    background: var(--eve-pink);
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
  color: var(--eve-gold);
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
  background: var(--eve-surface);

  &.mine {
    flex-direction: row-reverse;
    background: var(--eve-grad);
  }
  .gift-face {
    font-size: 32px;
    img {
      width: 1em;
      height: 1em;
      object-fit: contain;
      vertical-align: middle;
    }
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
      color: var(--eve-gold);
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
    background: var(--eve-surface);
  }
  &.mine {
    background: var(--eve-pink);
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
    background: var(--eve-surface);
  }
  &.mine {
    background: var(--eve-pink);
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
  background: var(--eve-surface);
  border-top: 1px solid var(--eve-line);
}

.quick-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  overflow-x: auto;
  &::-webkit-scrollbar {
    display: none;
  }
}

.quick {
  flex: 0 0 auto;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  color: var(--eve-text);
  background: var(--eve-bg);
  white-space: nowrap;
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
    background: var(--eve-bg);
    color: #fff;
    font-size: 14px;
    border: none;
    outline: none;
    &::placeholder {
      color: var(--eve-faint);
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
  align-items: center;
  padding-top: 10px;

  button {
    color: var(--eve-muted);
  }
  button img {
    width: 28px;
    height: 28px;
  }
  .mic-hold {
    touch-action: none;
    transition: color 0.15s, transform 0.15s;
    &.recording {
      color: var(--eve-pink);
      transform: scale(1.25);
    }
  }
}

/* 位置消息气泡 */
.loc-bubble {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 200px;
  padding: 10px;
  border-radius: 14px;
  background: var(--eve-surface);
  border: 1px solid var(--eve-line);
  &.mine {
    background: rgba(255, 42, 122, 0.12);
    border-color: rgba(255, 42, 122, 0.3);
  }
  .loc-map {
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 10px;
    color: #fff;
    background: var(--eve-grad);
  }
  .loc-info {
    min-width: 0;
    strong {
      display: block;
      font-size: 14px;
      color: #fff;
    }
    span {
      font-size: 12px;
      color: var(--eve-faint);
    }
  }
}

/* 录音浮层 */
.rec-overlay {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(8, 5, 14, 0.5);
}
.rec-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 180px;
  padding: 28px 0;
  border-radius: 20px;
  background: linear-gradient(180deg, #1d142b, #0b0712);
  border: 1px solid var(--eve-line);
  .rec-mic {
    font-size: 44px;
  }
  .rec-secs {
    font-size: 24px;
    font-weight: 800;
    color: #fff;
  }
  .rec-tip {
    font-size: 12px;
    color: var(--eve-muted);
  }
  &.cancel {
    border-color: #ff3b5c;
    .rec-tip {
      color: #ff3b5c;
    }
  }
}
</style>
