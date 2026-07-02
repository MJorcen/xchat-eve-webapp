<template>
  <section class="oim-chat">
    <!-- 顶栏:返回 + 对方头像 + 昵称 + 在线态 -->
    <header class="nav">
      <button class="back" @click="router.back()"><ChevronLeft :size="24" /></button>
      <div class="who" @click="goProfile">
        <div class="ava-wrap">
          <img v-if="peer.avatar" class="ava" :src="peer.avatar" alt="" />
          <span v-else class="ava fallback">{{ initial }}</span>
        </div>
        <div class="who-text">
          <strong>{{ peer.nickname }}</strong>
          <span :class="['st', state]">{{ stateText }}</span>
        </div>
      </div>
      <span class="oim-tag">OpenIM</span>
    </header>

    <!-- 消息区 -->
    <div ref="listEl" class="msgs">
      <!-- 对方介绍卡 -->
      <div class="intro-card" @click="goProfile">
        <div class="intro-ava-wrap">
          <img v-if="peer.avatar" class="intro-ava" :src="peer.avatar" alt="" />
          <span v-else class="intro-ava fallback">{{ initial }}</span>
        </div>
        <div class="intro-info">
          <div class="intro-top">
            <span class="intro-name">{{ peer.nickname }}<i v-if="peer.age" class="age">♀{{ peer.age }}</i></span>
            <button class="intro-view">View profile</button>
          </div>
          <p class="intro-text">{{ peer.intro || "Say hi and start chatting 👋" }}</p>
        </div>
      </div>

      <div v-for="m in msgs" :key="m.clientMsgID" :class="['row', { mine: m.self }]">
        <div v-if="!m.self" class="row-ava-wrap">
          <img v-if="peer.avatar" class="row-ava" :src="peer.avatar" alt="" />
          <span v-else class="row-ava fallback">{{ initial }}</span>
        </div>
        <div class="row-body">
          <img
            v-if="m.kind === 'image'"
            class="img-bubble"
            :src="m.imageUrl"
            :style="imgStyle(m)"
            alt=""
            @click="openImage(m.imageUrl!)"
          />
          <button
            v-else-if="m.kind === 'voice'"
            class="voice-bubble"
            :class="m.self ? 'mine' : 'other'"
            @click="playVoice(m)"
          >
            <span class="v-ico">{{ playingId === m.clientMsgID ? "⏸" : "▶" }}</span>
            <span class="v-wave"><i v-for="n in 5" :key="n" :style="{ height: 6 + ((n * 5) % 14) + 'px' }" /></span>
            <span class="v-dur">{{ m.voiceDur || 1 }}″</span>
          </button>
          <div
            v-else-if="m.kind === 'video'"
            class="video-bubble"
            :style="imgStyle({ imgW: m.coverW, imgH: m.coverH } as Row)"
            @click="openVideo(m.videoUrl!)"
          >
            <img v-if="m.coverUrl" :src="m.coverUrl" alt="" />
            <span class="play-ico">▶</span>
          </div>
          <div v-else class="bubble" :class="m.self ? 'mine' : 'other'">{{ m.text }}</div>
          <small class="t">{{ m.time }}</small>
        </div>
      </div>
      <div class="spacer" />
    </div>

    <!-- 全屏视频播放 -->
    <div v-if="videoPlaying" class="video-overlay" @click="videoPlaying = null">
      <video :src="videoPlaying" controls autoplay playsinline @click.stop />
    </div>

    <!-- 录音中提示 -->
    <div v-if="recording" class="rec-hint">🎙 松开发送 · 录音中…</div>

    <!-- 输入栏 -->
    <footer class="input">
      <button class="pick" :disabled="state !== 'ready' || uploading" @click="pickCamera">
        <Camera :size="20" />
      </button>
      <button class="pick" :disabled="state !== 'ready' || uploading" @click="pickImage">
        <ImagePlus :size="20" />
      </button>
      <button
        class="pick"
        :class="{ recording: recording }"
        :disabled="state !== 'ready' || uploading"
        @pointerdown.prevent="startRec"
        @pointerup.prevent="stopRec"
        @pointerleave="stopRec"
        @pointercancel="stopRec"
      >
        <Mic :size="20" />
      </button>
      <input
        ref="fileEl"
        type="file"
        accept="image/*"
        style="display: none"
        @change="onImagePicked"
      />
      <!-- 拍照:capture 属性在移动端调起相机 -->
      <input
        ref="camEl"
        type="file"
        accept="image/*"
        capture="environment"
        style="display: none"
        @change="onImagePicked"
      />
      <button class="pick" :disabled="state !== 'ready' || uploading" @click="pickVideo">
        <Film :size="20" />
      </button>
      <input
        ref="videoEl"
        type="file"
        accept="video/*"
        style="display: none"
        @change="onVideoPicked"
      />
      <input v-model="draft" :placeholder="uploading ? 'Uploading…' : 'Message…'" @keyup.enter="send" />
      <button class="send" :disabled="!draft.trim() || state !== 'ready'" @click="send">
        <Send :size="18" />
      </button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ChevronLeft, Send, ImagePlus, Camera, Mic, Film } from "lucide-vue-next";
import { showImagePreview } from "vant";
import {
  ensureOpenImLogin,
  oimSendText,
  oimSendImage,
  oimSendVoice,
  oimSendVideo,
  onOimMessages,
  oimHistory,
  oimMarkRead,
  oimSingleConversationId
} from "../services/openim";
import { fetchAnchorCard } from "../services/anchor";
import { useUserStore } from "../stores";
import type { MessageItem } from "@openim/wasm-client-sdk";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const peerId = String(route.params.peer || "200054");

type Row = {
  clientMsgID: string;
  kind: "text" | "image" | "voice" | "video";
  text: string;
  imageUrl?: string;
  imgW?: number;
  imgH?: number;
  voiceUrl?: string;
  voiceDur?: number;
  videoUrl?: string;
  coverUrl?: string;
  coverW?: number;
  coverH?: number;
  self: boolean;
  time: string;
};
type Peer = { nickname: string; avatar: string; intro: string; age: number; region: string };
const msgs = ref<Row[]>([]);
const peer = ref<Peer>({ nickname: peerId, avatar: "", intro: "", age: 0, region: "" });
const draft = ref("");
const state = ref<"connecting" | "ready" | "error">("connecting");
const stateText = ref("connecting…");
const listEl = ref<HTMLElement | null>(null);
const fileEl = ref<HTMLInputElement | null>(null);
const camEl = ref<HTMLInputElement | null>(null);
const videoEl = ref<HTMLInputElement | null>(null);
const videoPlaying = ref<string | null>(null);
const uploading = ref(false);
const recording = ref(false);
const playingId = ref<string | null>(null);
let mediaRecorder: MediaRecorder | null = null;
let recChunks: Blob[] = [];
let recStart = 0;
let audioEl: HTMLAudioElement | null = null;
let stop: (() => void) | null = null;

// 气泡里图片按原始比例约束尺寸(最大边 200)
function imgStyle(m: Row): Record<string, string> {
  const w = m.imgW || 0;
  const h = m.imgH || 0;
  if (!w || !h) return { width: "160px" };
  const max = 200;
  const scale = Math.min(1, max / Math.max(w, h));
  return { width: `${Math.round(w * scale)}px`, height: `${Math.round(h * scale)}px` };
}

function openImage(url: string) {
  showImagePreview([url]);
}

function pickImage() {
  fileEl.value?.click();
}

function pickCamera() {
  camEl.value?.click();
}

function pickVideo() {
  videoEl.value?.click();
}

function openVideo(url: string) {
  videoPlaying.value = url;
}

async function onVideoPicked(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file || state.value !== "ready") return;
  uploading.value = true;
  try {
    const sent = await oimSendVideo(peerId, file);
    push(sent);
  } catch (err) {
    stateText.value = `video failed: ${(err as Error).message}`;
  } finally {
    uploading.value = false;
  }
}

// 录音:按住开始,松开发送(微信式)
let recStopping = false;
async function startRec() {
  if (recording.value || uploading.value || state.value !== "ready") return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // 若按住期间已松手(异步竞态),立刻停掉不录
    if (recStopping) {
      stream.getTracks().forEach((t) => t.stop());
      recStopping = false;
      return;
    }
    const mime = MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "audio/webm";
    mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
    recChunks = [];
    recStart = Date.now();
    mediaRecorder.ondataavailable = (e) => e.data.size && recChunks.push(e.data);
    mediaRecorder.onstop = async () => {
      recording.value = false;
      stream.getTracks().forEach((t) => t.stop());
      const durSec = (Date.now() - recStart) / 1000;
      const blob = new Blob(recChunks, { type: mime });
      if (blob.size < 500 || durSec < 0.5) return; // 太短忽略
      uploading.value = true;
      try {
        const sent = await oimSendVoice(peerId, blob, durSec);
        push(sent);
      } catch (e) {
        stateText.value = `voice failed: ${(e as Error).message}`;
      } finally {
        uploading.value = false;
      }
    };
    mediaRecorder.start();
    recording.value = true;
  } catch (e) {
    stateText.value = `mic denied: ${(e as Error).message}`;
  }
}
function stopRec() {
  recStopping = true;
  if (recording.value && mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
  }
  setTimeout(() => (recStopping = false), 100);
}

function playVoice(m: Row) {
  if (!m.voiceUrl) return;
  if (playingId.value === m.clientMsgID) {
    audioEl?.pause();
    audioEl = null;
    playingId.value = null;
    return;
  }
  audioEl?.pause();
  audioEl = new Audio(m.voiceUrl);
  playingId.value = m.clientMsgID;
  audioEl.onended = () => (playingId.value = null);
  audioEl.onerror = () => (playingId.value = null);
  void audioEl.play();
}

async function onImagePicked(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = ""; // 允许重复选同一张
  if (!file || state.value !== "ready") return;
  uploading.value = true;
  try {
    const sent = await oimSendImage(peerId, file);
    push(sent);
  } catch (err) {
    stateText.value = `image failed: ${(err as Error).message}`;
  } finally {
    uploading.value = false;
  }
}

const initial = computed(() => (peer.value.nickname || peerId).slice(0, 1).toUpperCase());

function fmt(ms: number): string {
  const d = new Date(ms || Date.now());
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function toRow(m: MessageItem): Row | null {
  const self = String(m.sendID) === String(userStore.user.id);
  // 文本(101)
  if (m.contentType === 101) {
    const text = (m.textElem as { content?: string })?.content ?? "";
    if (!text) return null;
    return { clientMsgID: m.clientMsgID, kind: "text", text, self, time: fmt(m.sendTime) };
  }
  // 图片(102)
  if (m.contentType === 102) {
    const pic = (m.pictureElem as { sourcePicture?: { url?: string; width?: number; height?: number } })?.sourcePicture;
    if (!pic?.url) return null;
    return {
      clientMsgID: m.clientMsgID,
      kind: "image",
      text: "",
      imageUrl: pic.url,
      imgW: pic.width || 0,
      imgH: pic.height || 0,
      self,
      time: fmt(m.sendTime)
    };
  }
  // 语音(103)
  if (m.contentType === 103) {
    const snd = m.soundElem as { sourceUrl?: string; duration?: number } | undefined;
    if (!snd?.sourceUrl) return null;
    return {
      clientMsgID: m.clientMsgID,
      kind: "voice",
      text: "",
      voiceUrl: snd.sourceUrl,
      voiceDur: snd.duration || 0,
      self,
      time: fmt(m.sendTime)
    };
  }
  // 视频(104)
  if (m.contentType === 104) {
    const vid = m.videoElem as
      | { videoUrl?: string; snapshotUrl?: string; snapshotWidth?: number; snapshotHeight?: number }
      | undefined;
    if (!vid?.videoUrl) return null;
    return {
      clientMsgID: m.clientMsgID,
      kind: "video",
      text: "",
      videoUrl: vid.videoUrl,
      coverUrl: vid.snapshotUrl || "",
      coverW: vid.snapshotWidth || 0,
      coverH: vid.snapshotHeight || 0,
      self,
      time: fmt(m.sendTime)
    };
  }
  return null;
}

function push(m: MessageItem) {
  const row = toRow(m);
  if (!row) return;
  if (msgs.value.some((x) => x.clientMsgID === row.clientMsgID)) return;
  msgs.value.push(row);
  nextTick(() => {
    if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight;
  });
}

function goProfile() {
  router.push(`/anchor/${peerId}`);
}

async function send() {
  const text = draft.value.trim();
  if (!text || state.value !== "ready") return;
  draft.value = "";
  try {
    const sent = await oimSendText(peerId, text);
    push(sent);
  } catch (e) {
    stateText.value = `send failed: ${(e as Error).message}`;
  }
}

function markReadNow() {
  void oimMarkRead(oimSingleConversationId(peerId));
}

onMounted(async () => {
  // 对方真实资料(GET /user/info/get 卡片;非 mock)
  void fetchAnchorCard(Number(peerId), Number(userStore.user.id))
    .then(({ overlay }) => {
      peer.value = {
        nickname: overlay.nickname || peerId,
        avatar: overlay.avatar || "",
        intro: overlay.intro || "",
        age: overlay.age || 0,
        region: overlay.region || ""
      };
    })
    .catch(() => {
      /* 资料拉不到就用 id 兜底 */
    });

  try {
    stop = onOimMessages((m) => {
      if (String(m.sendID) === peerId || String(m.recvID) === peerId) {
        push(m);
        if (String(m.sendID) === peerId) markReadNow();
      }
    });
    await ensureOpenImLogin();
    state.value = "ready";
    stateText.value = "online";
    const history = await oimHistory(peerId);
    history.forEach(push);
    markReadNow();
  } catch (e) {
    state.value = "error";
    stateText.value = (e as Error).message;
  }
});

onUnmounted(() => stop?.());
</script>

<style scoped lang="scss">
.oim-chat {
  position: fixed;
  inset: 0;
  left: 50%;
  transform: translateX(-50%);
  width: min(500px, 100vw);
  display: flex;
  flex-direction: column;
  background: var(--eve-bg);
  z-index: 30;
}

/* 顶栏 */
.nav {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: calc(10px + env(safe-area-inset-top)) 12px 10px;
  border-bottom: 1px solid var(--eve-line);

  .back {
    color: #fff;
    display: flex;
    flex: 0 0 auto;
  }
  .who {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .ava-wrap {
    position: relative;
    flex: 0 0 auto;
  }
  .ava {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    object-fit: cover;
    display: grid;
    place-items: center;
    &.fallback {
      background: linear-gradient(135deg, #4e9cff, #7b61ff);
      color: #fff;
      font-weight: 700;
      font-size: 16px;
    }
  }
  .who-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    strong {
      color: #fff;
      font-size: 15px;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .st {
      font-size: 11px;
      color: var(--eve-faint);
      &.ready {
        color: #31c859;
      }
      &.error {
        color: #e5484d;
      }
    }
  }
  .oim-tag {
    flex: 0 0 auto;
    padding: 2px 8px;
    border-radius: 999px;
    background: #4e9cff;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
  }
}

/* 消息区 */
.msgs {
  flex: 1;
  overflow-y: auto;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 介绍卡 */
.intro-card {
  display: flex;
  gap: 12px;
  padding: 14px;
  border-radius: 16px;
  background: var(--eve-surface);
  border: 1px solid var(--eve-line);

  .intro-ava-wrap {
    flex: 0 0 auto;
  }
  .intro-ava {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    object-fit: cover;
    display: grid;
    place-items: center;
    &.fallback {
      background: linear-gradient(135deg, #4e9cff, #7b61ff);
      color: #fff;
      font-weight: 700;
      font-size: 22px;
    }
  }
  .intro-info {
    flex: 1;
    min-width: 0;
  }
  .intro-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .intro-name {
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    .age {
      margin-left: 6px;
      font-size: 11px;
      font-weight: 600;
      color: #ff7eb6;
      font-style: normal;
    }
  }
  .intro-view {
    flex: 0 0 auto;
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--eve-grad);
    color: #fff;
    font-size: 11px;
    font-weight: 600;
  }
  .intro-text {
    margin-top: 6px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--eve-muted);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

/* 消息行 */
.row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  &.mine {
    flex-direction: row-reverse;
  }
  .row-ava-wrap {
    flex: 0 0 auto;
  }
  .row-ava {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    object-fit: cover;
    display: grid;
    place-items: center;
    &.fallback {
      background: linear-gradient(135deg, #4e9cff, #7b61ff);
      color: #fff;
      font-weight: 700;
      font-size: 13px;
    }
  }
  .row-body {
    display: flex;
    flex-direction: column;
    max-width: 72%;
  }
  &.mine .row-body {
    align-items: flex-end;
  }
  .bubble {
    padding: 9px 13px;
    border-radius: 16px;
    font-size: 14px;
    line-height: 1.45;
    word-break: break-word;
    &.other {
      background: var(--eve-surface);
      color: #fff;
      border-bottom-left-radius: 5px;
    }
    &.mine {
      background: var(--eve-grad);
      color: #fff;
      border-bottom-right-radius: 5px;
    }
  }
  .img-bubble {
    border-radius: 14px;
    object-fit: cover;
    max-width: 200px;
    max-height: 200px;
    background: var(--eve-surface);
    cursor: pointer;
  }
  .video-bubble {
    position: relative;
    border-radius: 14px;
    overflow: hidden;
    max-width: 200px;
    max-height: 260px;
    background: #000;
    cursor: pointer;
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .play-ico {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 34px;
      color: #fff;
      text-shadow: 0 1px 6px rgba(0, 0, 0, 0.6);
    }
  }
  .voice-bubble {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 90px;
    padding: 10px 14px;
    border-radius: 16px;
    color: #fff;
    &.other {
      background: var(--eve-surface);
      border-bottom-left-radius: 5px;
    }
    &.mine {
      background: var(--eve-grad);
      border-bottom-right-radius: 5px;
    }
    .v-ico {
      font-size: 13px;
    }
    .v-wave {
      display: flex;
      align-items: center;
      gap: 2px;
      i {
        width: 3px;
        border-radius: 2px;
        background: rgba(255, 255, 255, 0.8);
      }
    }
    .v-dur {
      font-size: 12px;
      opacity: 0.9;
    }
  }
  .t {
    margin-top: 3px;
    font-size: 10px;
    color: var(--eve-faint);
  }
}

.spacer {
  height: 4px;
}

/* 输入栏 */
.rec-hint {
  text-align: center;
  padding: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #e5484d;
}

.video-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  video {
    max-width: 100%;
    max-height: 100%;
  }
}

.input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--eve-line);

  .pick {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    flex: 0 0 auto;
    color: var(--eve-muted);
    background: var(--eve-surface);
    border: 1px solid var(--eve-line);
    display: flex;
    align-items: center;
    justify-content: center;
    &:disabled {
      opacity: 0.4;
    }
    &.recording {
      color: #fff;
      background: #e5484d;
      border-color: #e5484d;
      animation: recpulse 1s ease-in-out infinite;
    }
  }
  @keyframes recpulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(229, 72, 77, 0.6); }
    50% { box-shadow: 0 0 0 6px rgba(229, 72, 77, 0); }
  }
  input[type="text"],
  input:not([type]) {
    flex: 1;
    height: 42px;
    padding: 0 14px;
    border-radius: 21px;
    background: var(--eve-surface);
    border: 1px solid var(--eve-line);
    color: #fff;
    font-size: 14px;
  }
  .send {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: var(--eve-grad);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    &:disabled {
      opacity: 0.4;
    }
  }
}
</style>
