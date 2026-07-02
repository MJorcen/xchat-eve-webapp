<template>
  <section class="oim-chat">
    <header class="top">
      <button class="back" @click="router.back()"><ChevronLeft :size="22" /></button>
      <div class="who">
        <strong>OpenIM · {{ peerId }}</strong>
        <span :class="['st', state]">{{ stateText }}</span>
      </div>
    </header>

    <div ref="listEl" class="msgs">
      <div v-for="m in msgs" :key="m.clientMsgID" :class="['row', { self: m.self }]">
        <div class="bubble">{{ m.text }}</div>
        <small class="t">{{ m.time }}</small>
      </div>
      <p v-if="!msgs.length" class="empty">No messages yet — say hi 👋</p>
    </div>

    <footer class="input">
      <input v-model="draft" placeholder="Message via OpenIM…" @keyup.enter="send" />
      <button class="send" :disabled="!draft.trim() || state !== 'ready'" @click="send">
        <Send :size="18" />
      </button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ChevronLeft, Send } from "lucide-vue-next";
import { ensureOpenImLogin, oimSendText, onOimMessages, oimHistory } from "../services/openim";
import { useUserStore } from "../stores";
import type { MessageItem } from "@openim/wasm-client-sdk";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const peerId = String(route.params.peer || "200054");

type Row = { clientMsgID: string; text: string; self: boolean; time: string };
const msgs = ref<Row[]>([]);
const draft = ref("");
const state = ref<"connecting" | "ready" | "error">("connecting");
const stateText = ref("connecting…");
const listEl = ref<HTMLElement | null>(null);
let stop: (() => void) | null = null;

function fmt(ms: number): string {
  const d = new Date(ms || Date.now());
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function toRow(m: MessageItem): Row | null {
  // 101=文本;其余类型 POC 先忽略
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
  if (msgs.value.some((x) => x.clientMsgID === row.clientMsgID)) return; // 去重
  msgs.value.push(row);
  nextTick(() => {
    if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight;
  });
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

onMounted(async () => {
  try {
    // 监听先于 login 注册(官方要求:否则可能漏掉登录后立刻同步下来的消息)
    stop = onOimMessages((m) => {
      // 只收当前对话的
      if (String(m.sendID) === peerId || String(m.recvID) === peerId) push(m);
    });
    await ensureOpenImLogin();
    state.value = "ready";
    stateText.value = "online";
    const history = await oimHistory(peerId);
    history.forEach(push);
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
  width: min(400PX, 100vw);
  display: flex;
  flex-direction: column;
  background: var(--eve-bg);
  z-index: 30;
}

.top {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 12px 10px;
  border-bottom: 1px solid var(--eve-line);

  .back {
    color: #fff;
    display: flex;
  }
  .who {
    display: flex;
    flex-direction: column;
    strong {
      color: #fff;
      font-size: 15px;
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
}

.msgs {
  flex: 1;
  overflow-y: auto;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  .row {
    display: flex;
    align-items: flex-end;
    gap: 6px;
    &.self {
      flex-direction: row-reverse;
    }
    .bubble {
      max-width: 72%;
      padding: 9px 13px;
      border-radius: 16px;
      background: var(--eve-surface);
      color: #fff;
      font-size: 14px;
      line-height: 1.45;
      word-break: break-word;
    }
    &.self .bubble {
      background: var(--eve-grad);
    }
    .t {
      font-size: 10px;
      color: var(--eve-faint);
    }
  }
  .empty {
    margin: auto;
    color: var(--eve-faint);
    font-size: 13px;
  }
}

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
