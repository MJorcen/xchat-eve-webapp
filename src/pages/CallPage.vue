<template>
  <section v-if="anchor" class="call-screen">
    <!-- 远端视频:ZEGO 流播到 #remote-video;真首帧到达前不揭示(显示主播头像铺底,避免空流黑屏) -->
    <img class="remote" :src="anchor.avatar" alt="" />
    <div id="remote-video" class="remote-video" :class="{ shown: remoteReady }" />
    <div class="scrim-top" />
    <div class="scrim-bottom" />

    <!-- 顶部身份 + 挂断 -->
    <header class="top">
      <div class="who">
        <img class="who-avatar" :src="anchor.avatar" alt="" />
        <div class="who-text">
          <strong>{{ anchor.nickname }}</strong>
          <span v-if="callState.free" class="free">{{ t("callPage.freeCall") }}</span>
          <span v-else class="price">
            <Coins :size="13" :stroke-width="1.8" />{{ anchor.price }}{{ t("callPage.perMin") }}
          </span>
        </div>
      </div>
      <button class="hangup-top" @click="onHangup"><PhoneOff :size="20" :stroke-width="2.2" /></button>
    </header>

    <div class="meter">
      <div class="timer">{{ callState.phase === "ringing" ? t("callPage.calling") : elapsed }}</div>
      <div v-if="!callState.free && callState.phase === 'active'" class="spent">
        <Coins :size="13" :stroke-width="1.8" />{{ callState.coinCost }}
      </div>
    </div>

    <!-- 本地 PIP:ZEGO 本地预览播到 #local-video -->
    <div class="pip">
      <div id="local-video" class="pip-local" />
      <img v-if="callState.cameraOn" class="pip-fallback" :src="user?.avatar" alt="" />
      <div v-else class="pip-off"><VideoOff :size="26" :stroke-width="1.8" /></div>
      <button class="pip-switch" @click="switchCamera"><SwitchCamera :size="15" :stroke-width="2" /></button>
    </div>

    <!-- 公屏聊天 -->
    <div ref="msgScroll" class="screen-msgs">
      <div v-for="(m, i) in msgList" :key="i" class="msg" :class="{ sys: m.system }">
        <template v-if="m.system">
          <span class="sys-txt">{{ m.text }}</span>
        </template>
        <template v-else-if="m.gift">
          <b class="from" :class="{ self: m.fromSelf }">{{ m.fromSelf ? t("callPage.you") : anchor.nickname }}</b>
          <span class="g-txt">{{ t("callPage.sentGift") }}</span>
          <span class="g-ico">{{ m.gift }}</span>
          <span class="g-x">×{{ m.count }}</span>
        </template>
        <template v-else>
          <b class="from" :class="{ self: m.fromSelf }">{{ m.fromSelf ? t("callPage.you") : anchor.nickname }}</b>
          <span class="m-txt">{{ m.text }}</span>
        </template>
      </div>
    </div>

    <!-- 女端索要礼物:跳动提醒,点击去送礼 -->
    <button v-if="askGift" class="ask-gift" @click="onAskGiftClick">
      <span class="ask-ico">{{ askGift.giftIcon || "🎁" }}</span>
      <span class="ask-txt">
        <b>{{ anchor.nickname }} asks for a gift</b>
        <small v-if="askGift.giftName"><Coins :size="11" :stroke-width="2" />{{ askGift.giftName }} · {{ askGift.giftPrice }}</small>
      </span>
      <span class="ask-send">Send</span>
    </button>

    <!-- 快捷礼物条 -->
    <div class="quick-gifts">
      <button v-for="g in quickGifts" :key="g.id" class="qg" @click="sendQuick(g)">
        <span class="qg-ico">{{ g.icon }}</span>
        <span class="qg-price"><Coins :size="11" :stroke-width="2" />{{ g.price }}</span>
      </button>
    </div>

    <!-- 底部:输入 + 操作 -->
    <footer class="dock">
      <div class="input-bar">
        <input v-model="draft" :placeholder="t('callPage.saySomething')" @keyup.enter="sendMsg" />
        <button class="send" :class="{ on: draft.trim() }" @click="sendMsg"><Send :size="18" :stroke-width="2" /></button>
      </div>
      <button class="act" @click="toggleMic">
        <component :is="callState.micOn ? Mic : MicOff" :size="22" :stroke-width="1.9" />
      </button>
      <button class="act gift" @click="showGift = true"><Gift :size="22" :stroke-width="1.9" /></button>
    </footer>

    <!-- 余额不足倒计时弹窗 -->
    <van-popup :show="showCountdown" round teleport="body" class="cd-popup" :z-index="9930" :close-on-click-overlay="false">
      <div class="cd">
        <div class="cd-ring">{{ countdown }}</div>
        <p class="cd-tip">{{ t("call.lowBalance") }}</p>
        <p class="cd-sub">{{ t("call.endingIn", { n: countdown }) }}</p>
        <button class="cd-topup" @click="goRecharge">{{ t("call.topUp") }}</button>
        <button class="cd-hang" @click="hangup">{{ t("call.hangUp") }}</button>
      </div>
    </van-popup>

    <GiftPanel v-model:show="showGift" :anchor="anchor" @sent="onGiftSent" />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { showConfirmDialog } from "vant";
import { useI18n } from "vue-i18n";
import { Coins, PhoneOff, SwitchCamera, Mic, MicOff, VideoOff, Gift, Send } from "lucide-vue-next";
import emitter from "../common/eventBus";
import { api } from "../services/api";
import {
  prepareLocalStream,
  joinRoom,
  publishLocal,
  playStream,
  watchRoomStreams,
  leaveRoom,
  sendCallCommand,
  onCallCommand,
  type CallCommand
} from "../services/zego";
import { useCall } from "../composables/useCall";
import { useGiftAnimation } from "../composables/useGiftAnimation";
import { useUserStore } from "../stores";
import GiftPanel from "../components/GiftPanel.vue";
import type { Anchor, CurrentUser, Gift as GiftType } from "../types/eve";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const anim = useGiftAnimation();
const { callState, elapsed, startOutgoing, hangup, leaveCall, toggleMic, switchCamera, addGiftCost, getEveContext } =
  useCall();
let stopRemote: (() => void) | null = null;
let stopCommand: (() => void) | null = null;
let localReady: Promise<unknown> | null = null;
let published = false;

// 推本端流(去重)。selfStreamId 按角色取:player→playerStreamId,anchor→anchorStreamId。
async function publishSelf(trigger: "dial" | "invite" | "accept") {
  if (published) return;
  const ctx = getEveContext();
  if (!ctx) return;
  const selfStreamId = callState.role === "anchor" ? ctx.anchorStreamId : ctx.playerStreamId;
  await localReady; // 等并行预采集结果
  publishLocal(selfStreamId, trigger);
  published = true;
}

// 入房 + 推拉流(本端=男端,秒开主体):早拉对端、推流后置(接通才推,不阻塞看对端首帧)。
// 被叫已偷跑预入房 + 预拉 → joinRoom 幂等、playStream 直接贴预拉的 view(秒显)。
async function joinZego() {
  const ctx = getEveContext();
  if (!ctx || stopRemote) return;
  const out = callState.direction === "out";
  // self/peer 按主叫(player)/被叫(anchor)选流:主叫推 playerStreamId 拉 anchorStreamId,被叫反之
  const peerStreamId = callState.role === "anchor" ? ctx.playerStreamId : ctx.anchorStreamId;
  stopRemote = watchRoomStreams("remote-video"); // 兜底:对端真正推流(ADD)时拉
  const ok = await joinRoom(ctx.rtcRoomId, ctx.rtcToken, String(userStore.user.id), out ? "dial" : "accept").catch(
    () => false
  );
  if (!ok) return;
  void playStream(peerStreamId, "remote-video", out ? "dial" : "invite"); // 拉对端(看)
  // 男端(player)只看不推流(摄像头本地预览开着,但不 publish);只有女端(anchor)把自己的流推给对端看。
  if (callState.role === "anchor") await publishSelf(out ? "dial" : "invite");
}

const id = Number(route.params.id);
const anchor = ref<Anchor | null>(null);
const remoteReady = ref(false); // 对端真首帧是否到达(到达才揭示 #remote-video,之前显头像占位)
const askGift = ref<CallCommand | null>(null); // 女端「索要礼物」→ 显示跳动礼物提醒
let askTimer: number | null = null;
const user = ref<CurrentUser | null>(null);
const showGift = ref(false);
const quickGifts = ref<GiftType[]>([]);
const draft = ref("");
const msgScroll = ref<HTMLElement | null>(null);
type Msg = { text?: string; gift?: string; count?: number; fromSelf?: boolean; system?: boolean };
const msgList = ref<Msg[]>([]);
const greetTimers: number[] = [];

const lowBalance = computed(
  () => !callState.free && callState.phase === "active" && !!anchor.value && userStore.coins < anchor.value.price
);

// 余额不足倒计时:10s 内不充值则自动挂断
const showCountdown = ref(false);
const countdown = ref(10);
let cdTimer: number | null = null;

function stopCountdown() {
  if (cdTimer) {
    window.clearInterval(cdTimer);
    cdTimer = null;
  }
  showCountdown.value = false;
}

function goRecharge() {
  stopCountdown();
  router.push("/recharge");
}

watch(lowBalance, (low) => {
  if (low && !showCountdown.value) {
    showCountdown.value = true;
    countdown.value = 10;
    cdTimer = window.setInterval(() => {
      countdown.value -= 1;
      if (countdown.value <= 0) {
        stopCountdown();
        hangup();
      }
    }, 1000);
  } else if (!low) {
    stopCountdown(); // 充值后余额恢复,撤销倒计时
  }
});

function pushMsg(m: Msg) {
  msgList.value.push(m);
  nextTick(() => {
    if (msgScroll.value) msgScroll.value.scrollTop = msgScroll.value.scrollHeight;
  });
}

// 通话内互动命令(对端经 ZEGO 自定义命令发来):文字进公屏、送礼播动画、索要礼物弹跳动提醒。
function onCommand(cmd: CallCommand) {
  if (cmd.t === "text" && cmd.text) {
    pushMsg({ text: cmd.text, fromSelf: false });
  } else if (cmd.t === "gift") {
    pushMsg({ gift: cmd.giftIcon || "🎁", count: cmd.count || 1, fromSelf: false });
    if (cmd.giftIcon) {
      anim.play({ id: cmd.giftId || 0, icon: cmd.giftIcon, name: cmd.giftName || "", price: cmd.giftPrice || 0 } as GiftType, cmd.count || 1, false);
    }
  } else if (cmd.t === "ask") {
    askGift.value = cmd; // 女端索要礼物 → 跳动礼物提醒(点击去送礼)
    if (askTimer) window.clearTimeout(askTimer);
    askTimer = window.setTimeout(() => (askGift.value = null), 12000);
  }
}

// 点击「索要礼物」跳动提醒 → 打开礼物面板送礼(点击可以过去)
function onAskGiftClick() {
  askGift.value = null;
  if (askTimer) window.clearTimeout(askTimer);
  showGift.value = true;
}

// 对端真首帧到达(zego bindFirstFrame 校验 videoWidth>0 后发)→ 揭示对端画面(真秒开)
function onFirstFrame() {
  remoteReady.value = true;
}

function sendMsg() {
  const text = draft.value.trim();
  if (!text) return;
  pushMsg({ text, fromSelf: true });
  sendCallCommand(id, { t: "text", text }); // 实时发给对端(女端公屏)
  draft.value = "";
}

function sendQuick(g: GiftType) {
  if (userStore.coins < g.price) {
    emitter.emit("toast", t("gift.notEnoughCoins"));
    router.push("/recharge");
    return;
  }
  userStore.addCoins(-g.price);
  anim.play(g, 1, true);
  addGiftCost(g.price);
  pushMsg({ gift: g.icon, count: 1, fromSelf: true });
  sendCallCommand(id, { t: "gift", giftId: g.id, giftIcon: g.icon, giftName: g.name, giftPrice: g.price, count: 1 });
}

// 通话结束 → 结算页(携带计费明细)
function onHangupEvent(p: { anchor: Anchor; duration: number }) {
  if (p.anchor.id === id) {
    router.replace(
      `/call-summary/${id}?duration=${p.duration}&coins=${callState.coinCost}&gift=${callState.giftCost}&free=${callState.free ? 1 : 0}&eveId=${callState.eveId}`
    );
  }
}

function onGiftSent({ gift, count }: { gift: GiftType; count: number }) {
  addGiftCost(gift.price * count);
  pushMsg({ gift: gift.icon, count, fromSelf: true });
  sendCallCommand(id, { t: "gift", giftId: gift.id, giftIcon: gift.icon, giftName: gift.name, giftPrice: gift.price, count });
}

async function onHangup() {
  try {
    await showConfirmDialog({
      title: t("callPage.hangUpTitle"),
      message: t("callPage.hangUpMessage"),
      confirmButtonText: t("call.hangUp")
    });
  } catch {
    return;
  }
  hangup();
}

// 接通后公屏来点"生气"(系统进场 + 主播两句寒暄)
watch(
  () => callState.phase,
  (phase, prev) => {
    if (phase === "active" && prev !== "active") {
      // 接通即推本端流(秒开方案「晚推自己」):男端(player)接通才推,避免响铃期点亮摄像头;
      // 女端(anchor)已在 joinZego 早推,publishSelf 幂等(published 标志)会跳过,不会重复推。
      void publishSelf("accept");
      if (anchor.value) {
        pushMsg({ system: true, text: t("callPage.joined", { name: anchor.value.nickname }) });
        greetTimers.push(window.setTimeout(() => pushMsg({ text: t("callPage.greet1"), fromSelf: false }), 2600));
        greetTimers.push(window.setTimeout(() => pushMsg({ text: t("callPage.greet2"), fromSelf: false }), 7200));
      }
    }
  }
);

// EveContext 就绪兜底:onMounted 里 joinZego 可能早于 requestCall 返回(eveId 还没落) → 直接 return、整通无推拉流。
// eveId 一旦落定(去电 request 返回 / 被叫 accept)就重跑 joinZego(内部 stopRemote/joinedRoomId 幂等,不会重复入房)。
watch(
  () => callState.eveId,
  (id) => {
    if (id) void joinZego();
  }
);

onMounted(async () => {
  const [a, u, gifts] = await Promise.all([api.getAnchor(id), api.getCurrentUser(), api.getGifts()]);
  anchor.value = a;
  user.value = u;
  quickGifts.value = gifts.slice(0, 4);
  await nextTick(); // 等 #local-video 渲染
  // 秒开①:并行预采集本地流(与 requestCall 同时进行,接通时不再花时间采集)
  localReady = prepareLocalStream("local-video").catch(() => null);
  // 直接进入 /call/:id(深链/去电)时若无进行中的通话,则发起去电(await 以便拿到 EveContext)。
  // 拨号目标用路由 id(真实对端),mock getAnchor 仅供展示(它对未知 id 会回退 anchors[0],不能拿来当被叫)。
  if (callState.target?.id !== id || callState.phase === "idle" || callState.phase === "ended") {
    await startOutgoing({ ...a, id });
  }
  // 拿到 EveContext 后入房推拉流(去电:request 后;被叫:accept 后已就绪)
  await joinZego();
  stopCommand = onCallCommand(onCommand); // 通话内互动命令(对端文字/礼物/索要礼物)
  emitter.on("call:hangup", onHangupEvent);
  emitter.on("rtc:first-frame", onFirstFrame);
});

onUnmounted(() => {
  stopCommand?.();
  if (askTimer) window.clearTimeout(askTimer);
  emitter.off("call:hangup", onHangupEvent);
  emitter.off("rtc:first-frame", onFirstFrame);
  greetTimers.forEach((tid) => window.clearTimeout(tid));
  stopCountdown();
  stopRemote?.();
  // 离开通话页(返回/跳充值)= 结束本通:释放占用锁 + 通知后端结束(防后端空跑计费)+ 退 ZEGO。
  // 已显式 hangup(phase=ended)则无副作用。
  leaveCall();
  void leaveRoom();
});
</script>

<style scoped lang="scss">
.call-screen {
  position: fixed;
  inset: 0;
  left: 50%;
  transform: translateX(-50%);
  width: min(400PX, 100vw);
  background: #000;
  overflow: hidden;
}

.remote {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0; /* 头像铺底(最底层) */
}
.remote-video {
  position: absolute;
  inset: 0;
  /* 远端视频作背景层:必须在头像之上、但在所有 UI(z-index:auto,DOM 在后)之下。
     原来 z-index:1 会盖住计时/挂断/公屏/底部控件等所有 auto 层 → 一拉到流整屏被黑帧遮住。
     置 0 后与 UI 同处 z-index:0/auto 绘制步,按 DOM 顺序:头像→视频→各 UI,UI 正常浮在视频上。 */
  z-index: 0;
  /* 真首帧到达前不揭示:opacity 0 → 头像占位透出;避免「允许拉空流」时的空/黑帧盖住头像。 */
  opacity: 0;
  transition: opacity 0.25s ease;
  &.shown {
    opacity: 1;
  }
  :deep(video) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.scrim-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 26%;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.6), transparent);
}

.scrim-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 44%;
  background: linear-gradient(0deg, rgba(8, 5, 14, 0.92), transparent);
}

.top {
  position: absolute;
  top: calc(14px + env(safe-area-inset-top));
  left: 14px;
  right: 14px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.who {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 12px 5px 5px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(6px);
}

.who-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.who-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  strong {
    font-size: 15px;
    font-weight: 700;
    color: #fff;
  }
  .free {
    font-size: 11px;
    color: var(--eve-green);
  }
  .price {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--eve-gold);
  }
}

.hangup-top {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: #ff3b50;
  box-shadow: 0 4px 14px rgba(255, 59, 80, 0.5);
}

.meter {
  position: absolute;
  top: calc(64px + env(safe-area-inset-top));
  left: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.timer {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

.spent {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 700;
  color: var(--eve-gold);
}

.pip {
  position: absolute;
  top: calc(62px + env(safe-area-inset-top));
  right: 14px;
  width: 92px;
  height: 132px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: var(--eve-surface);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .pip-local {
    position: absolute;
    inset: 0;
    z-index: 1;
    :deep(video) {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
}

.pip-off {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: var(--eve-faint);
}

.pip-switch {
  position: absolute;
  right: 6px;
  bottom: 6px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  display: grid;
  place-items: center;
}

.screen-msgs {
  position: absolute;
  left: 14px;
  right: 96px;
  bottom: 132px;
  max-height: 34vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 7px;
  -webkit-mask-image: linear-gradient(180deg, transparent, #000 18%);
  mask-image: linear-gradient(180deg, transparent, #000 18%);
  &::-webkit-scrollbar {
    display: none;
  }
}

.msg {
  align-self: flex-start;
  max-width: 100%;
  padding: 6px 11px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(2px);
  font-size: 13px;
  line-height: 1.35;
  color: #fff;

  .from {
    font-weight: 700;
    color: #ffb0c8;
    margin-right: 5px;
    &.self {
      color: #c0a3ff;
    }
  }
  .g-txt {
    color: rgba(255, 255, 255, 0.85);
  }
  .g-ico {
    margin: 0 4px;
    font-size: 16px;
    vertical-align: middle;
  }
  .g-x {
    font-weight: 800;
    color: var(--eve-pink);
  }
  &.sys {
    align-self: center;
    background: rgba(153, 69, 255, 0.18);
    border: 1px solid rgba(153, 69, 255, 0.3);
    .sys-txt {
      font-size: 12px;
      color: #d4c2ff;
    }
  }
}

.quick-gifts {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 80px;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  &::-webkit-scrollbar {
    display: none;
  }
}

.qg {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 52px;
  padding: 7px 0 5px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--eve-line);
  backdrop-filter: blur(4px);

  .qg-ico {
    font-size: 24px;
    line-height: 1;
  }
  .qg-price {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 10px;
    font-weight: 700;
    color: var(--eve-gold);
  }
}

/* 女端索要礼物:跳动提醒 */
.ask-gift {
  position: absolute;
  left: 14px;
  bottom: 128px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px 8px 10px;
  border-radius: 30px;
  background: linear-gradient(120deg, #ff2a7a, #9945ff);
  box-shadow: var(--eve-glow-pink);
  animation: askBounce 0.9s ease-in-out infinite;

  .ask-ico {
    font-size: 28px;
    line-height: 1;
  }
  .ask-txt {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    b {
      font-size: 13px;
      color: #fff;
      font-weight: 700;
    }
    small {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.85);
    }
  }
  .ask-send {
    padding: 5px 14px;
    border-radius: 16px;
    background: #fff;
    color: #ff2a7a;
    font-size: 13px;
    font-weight: 800;
  }
}
@keyframes askBounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-7px);
  }
}

.dock {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 10px calc(10px + env(safe-area-inset-bottom));
}

.input-bar {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 44px;
  padding: 0 6px 0 14px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(8px);

  input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: transparent;
    color: #fff;
    font-size: 14px;
    &::placeholder {
      color: rgba(255, 255, 255, 0.55);
    }
  }
  .send {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: rgba(255, 255, 255, 0.5);
    background: rgba(255, 255, 255, 0.1);
    transition: all 0.2s;
    &.on {
      color: #fff;
      background: var(--eve-grad);
      box-shadow: var(--eve-glow-pink);
    }
  }
}

.act {
  flex: 0 0 auto;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(8px);

  &.gift {
    color: #fff;
    background: var(--eve-grad);
    box-shadow: var(--eve-glow-pink);
  }
}

.cd {
  width: 280px;
  padding: 28px 24px 22px;
  background: linear-gradient(180deg, #1d142b, #0b0712);
  border: 1px solid var(--eve-line);
  border-radius: 24px;
  text-align: center;

  .cd-ring {
    width: 64px;
    height: 64px;
    margin: 0 auto;
    border-radius: 50%;
    border: 3px solid var(--eve-pink);
    box-shadow: var(--eve-glow-pink);
    display: grid;
    place-items: center;
    font-size: 24px;
    font-weight: 800;
    color: var(--eve-gold);
  }
  .cd-tip {
    margin-top: 16px;
    font-size: 16px;
    font-weight: 700;
    color: #fff;
  }
  .cd-sub {
    margin-top: 6px;
    font-size: 13px;
    color: var(--eve-muted);
  }
  .cd-topup {
    width: 100%;
    height: 46px;
    margin-top: 18px;
    border-radius: 23px;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    background: var(--eve-grad);
    box-shadow: var(--eve-glow-pink);
  }
  .cd-hang {
    margin-top: 12px;
    font-size: 14px;
    color: var(--eve-muted);
  }
}
</style>
