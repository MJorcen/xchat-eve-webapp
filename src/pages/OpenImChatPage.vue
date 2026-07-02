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
          <div class="bubble" :class="m.self ? 'mine' : 'other'">{{ m.text }}</div>
          <small class="t">{{ m.time }}</small>
        </div>
      </div>
      <div class="spacer" />
    </div>

    <!-- 输入栏 -->
    <footer class="input">
      <input v-model="draft" placeholder="Message…" @keyup.enter="send" />
      <button class="send" :disabled="!draft.trim() || state !== 'ready'" @click="send">
        <Send :size="18" />
      </button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ChevronLeft, Send } from "lucide-vue-next";
import {
  ensureOpenImLogin,
  oimSendText,
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

type Row = { clientMsgID: string; text: string; self: boolean; time: string };
type Peer = { nickname: string; avatar: string; intro: string; age: number; region: string };
const msgs = ref<Row[]>([]);
const peer = ref<Peer>({ nickname: peerId, avatar: "", intro: "", age: 0, region: "" });
const draft = ref("");
const state = ref<"connecting" | "ready" | "error">("connecting");
const stateText = ref("connecting…");
const listEl = ref<HTMLElement | null>(null);
let stop: (() => void) | null = null;

const initial = computed(() => (peer.value.nickname || peerId).slice(0, 1).toUpperCase());

function fmt(ms: number): string {
  const d = new Date(ms || Date.now());
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function toRow(m: MessageItem): Row | null {
  if (m.contentType !== 101) return null;
  let text = "";
  try {
    text = (m.textElem as { content?: string })?.content ?? "";
  } catch {
    /* ignore */
  }
  if (!text) return null;
  return {
    clientMsgID: m.clientMsgID,
    text,
    self: String(m.sendID) === String(userStore.user.id),
    time: fmt(m.sendTime)
  };
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
.input {
  display: flex;
  gap: 8px;
  padding: 10px 12px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--eve-line);

  input {
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
