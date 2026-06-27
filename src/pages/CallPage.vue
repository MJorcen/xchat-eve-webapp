<template>
  <section v-if="anchor" class="call-screen">
    <!-- 远端"视频"（mock：主播头像铺底） -->
    <img class="remote" :src="anchor.avatar" alt="" />
    <div class="scrim-top" />
    <div class="scrim-bottom" />

    <!-- 顶部身份 + 计费 -->
    <header class="top">
      <div class="who">
        <img class="who-avatar" :src="anchor.avatar" alt="" />
        <div class="who-text">
          <strong>{{ anchor.nickname }}</strong>
          <span v-if="callState.free" class="free">Free call</span>
          <span v-else class="price">
            <img src="/assets/eve/callDialog/coin_300@2x.png" alt="" />{{ anchor.price }}/min
          </span>
        </div>
      </div>
    </header>

    <div class="meter">
      <div class="timer">{{ callState.phase === "ringing" ? "Calling…" : elapsed }}</div>
      <div v-if="!callState.free && callState.phase === 'active'" class="spent">
        <img src="/assets/eve/chatRoom/coin_16@2x.png" alt="" />{{ callState.coinCost }}
      </div>
    </div>

    <!-- 本地 PIP -->
    <div class="pip">
      <img v-if="callState.cameraOn" :src="user?.avatar" alt="" />
      <div v-else class="pip-off">
        <img src="/assets/eve/callDialog/ic_camera_close@2x.png" alt="" />
      </div>
      <button class="pip-switch" @click="switchCamera">
        <img src="/assets/eve/callDialog/ic_changecamera@2x.png" alt="" />
      </button>
    </div>

    <!-- 聊天浮层 -->
    <div class="overlay-msgs">
      <div v-for="(m, i) in msgList" :key="i" class="bubble">
        <template v-if="m.gift">{{ m.fromSelf ? "You sent" : anchor.nickname }} {{ m.gift }} <b>×{{ m.count }}</b></template>
        <template v-else>{{ m.fromSelf ? "You" : anchor.nickname }}: {{ m.text }}</template>
      </div>
    </div>

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

    <!-- 底部控制 -->
    <footer class="controls">
      <button class="ctrl" @click="toggleMic">
        <img :src="callState.micOn ? '/assets/eve/callDialog/ic_calling_mic@2x.png' : '/assets/eve/callDialog/ic_mic-off@2x.png'" alt="" />
      </button>
      <button class="ctrl" @click="toggleCamera">
        <img :src="callState.cameraOn ? '/assets/eve/callDialog/ic_camera_open@2x.png' : '/assets/eve/callDialog/ic_camera_close@2x.png'" alt="" />
      </button>
      <button class="ctrl gift" @click="showGift = true">
        <img src="/assets/eve/callDialog/ic_calling_gift@2x.png" alt="" />
      </button>
      <button class="ctrl coin" @click="router.push('/recharge')">
        <img src="/assets/eve/callDialog/ic_calling_coin@2x.png" alt="" />
      </button>
      <button class="ctrl hangup" @click="onHangup">
        <img src="/assets/eve/callDialog/ic_phone-hangup@2x.png" alt="" />
      </button>
    </footer>

    <GiftPanel v-model:show="showGift" :anchor="anchor" @sent="onGiftSent" />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { showConfirmDialog } from "vant";
import { useI18n } from "vue-i18n";
import emitter from "../common/eventBus";
import { api } from "../services/api";
import { useCall } from "../composables/useCall";
import { useUserStore } from "../stores";
import GiftPanel from "../components/GiftPanel.vue";
import type { Anchor, CurrentUser, Gift } from "../types/eve";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { callState, elapsed, startOutgoing, hangup, reset, toggleMic, toggleCamera, switchCamera, addGiftCost } = useCall();

const id = Number(route.params.id);
const anchor = ref<Anchor | null>(null);
const user = ref<CurrentUser | null>(null);
const showGift = ref(false);
const msgList = ref<{ text?: string; gift?: string; count?: number; fromSelf: boolean }[]>([]);

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

function onMessage(p: { fromId: number; text: string }) {
  if (p.fromId === id) msgList.value.push({ text: p.text, fromSelf: false });
}

// 通话结束 → 结算页（携带计费明细）
function onHangupEvent(p: { anchor: Anchor; duration: number }) {
  if (p.anchor.id === id) {
    router.replace(
      `/call-summary/${id}?duration=${p.duration}&coins=${callState.coinCost}&gift=${callState.giftCost}&free=${callState.free ? 1 : 0}`
    );
  }
}

function onGiftSent({ gift, count }: { gift: Gift; count: number }) {
  addGiftCost(gift.price * count);
  msgList.value.push({ gift: gift.icon, count, fromSelf: true });
}

async function onHangup() {
  try {
    await showConfirmDialog({ title: "Hang up?", message: "End this video call?", confirmButtonText: "Hang up" });
  } catch {
    return;
  }
  hangup();
}

onMounted(async () => {
  const [a, u] = await Promise.all([api.getAnchor(id), api.getCurrentUser()]);
  anchor.value = a;
  user.value = u;
  // 直接进入 /call/:id（深链/去电）时若无进行中的通话，则发起去电
  if (callState.target?.id !== id || callState.phase === "idle" || callState.phase === "ended") {
    startOutgoing(a);
  }
  emitter.on("message:new", onMessage);
  emitter.on("call:hangup", onHangupEvent);
});

onUnmounted(() => {
  emitter.off("message:new", onMessage);
  emitter.off("call:hangup", onHangupEvent);
  stopCountdown();
  // 离开通话页时若仍在拨号/响铃，取消（清掉 ringTimer，避免后台自动接通并继续计费）
  if (callState.phase === "ringing" || callState.phase === "incoming") reset();
});
</script>

<style scoped lang="scss">
.call-screen {
  position: fixed;
  inset: 0;
  background: #000;
  overflow: hidden;
}

.remote {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scrim-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 30%;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.55), transparent);
}

.scrim-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 30%;
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.6), transparent);
}

.top {
  position: absolute;
  top: 16px;
  left: 16px;
  right: 16px;
}

.who {
  display: flex;
  align-items: center;
  gap: 10px;
}

.who-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.who-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  strong {
    font-size: 16px;
    color: #fff;
  }
  .free {
    font-size: 12px;
    color: #00e397;
  }
  .price {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #ffd36e;
    img {
      width: 14px;
      height: 14px;
    }
  }
}

.meter {
  position: absolute;
  top: 72px;
  left: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timer {
  font-size: 15px;
  color: #fff;
}

.spent {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #ffd36e;
  img {
    width: 14px;
    height: 14px;
  }
}

.pip {
  position: absolute;
  top: 64px;
  right: 16px;
  width: 96px;
  height: 140px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: #3a2526;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.pip-off {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  img {
    width: 32px;
    height: 32px;
  }
}

.pip-switch {
  position: absolute;
  right: 6px;
  bottom: 6px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  display: grid;
  place-items: center;
  img {
    width: 16px;
    height: 16px;
  }
}

.overlay-msgs {
  position: absolute;
  left: 16px;
  bottom: 130px;
  max-height: 30vh;
  max-width: 70%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bubble {
  align-self: flex-start;
  padding: 6px 12px;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  font-size: 13px;
  b {
    color: #ff5473;
  }
}

.cd {
  width: 280px;
  padding: 28px 24px 22px;
  background: linear-gradient(180deg, #4a2526, #2c1a1a);
  border-radius: 24px;
  text-align: center;

  .cd-ring {
    width: 64px;
    height: 64px;
    margin: 0 auto;
    border-radius: 50%;
    border: 3px solid #eb6300;
    display: grid;
    place-items: center;
    font-size: 24px;
    font-weight: 800;
    color: #ffd36e;
  }
  .cd-tip {
    margin-top: 16px;
    font-size: 16px;
    font-weight: 600;
    color: #fff;
  }
  .cd-sub {
    margin-top: 6px;
    font-size: 13px;
    color: #9a8b8b;
  }
  .cd-topup {
    width: 100%;
    height: 46px;
    margin-top: 18px;
    border-radius: 23px;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    background: linear-gradient(90deg, #ff5473, #eb6300);
  }
  .cd-hang {
    margin-top: 12px;
    font-size: 14px;
    color: #9a8b8b;
  }
}

.controls {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 16px 20px calc(16px + env(safe-area-inset-bottom));
}

.ctrl {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(76, 84, 90, 0.7);
  display: grid;
  place-items: center;
  img {
    width: 26px;
    height: 26px;
  }

  &.gift img {
    width: 30px;
    height: 30px;
  }
  &.hangup {
    background: #ff4d4f;
  }
}
</style>
