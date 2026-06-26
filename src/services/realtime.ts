import emitter from "@/common/eventBus";
import { eveMockApi } from "./eveMockApi";
import type { Gift } from "@/types/eve";

// mock 实时层：用定时器模拟服务端推送（来电、新消息、礼物、通知）。
// 在真实接入阶段，这一层会被 WebSocket / IM 监听替换，对页面订阅方完全透明。

let started = false;
let timers: number[] = [];

function pickRandom<T>(arr: T[]): T {
  // 不用 Math.random 之外没必要的复杂度；模拟器用随机即可
  return arr[Math.floor(Math.random() * arr.length)];
}

export const realtime = {
  start() {
    if (started) return;
    started = true;

    const anchors = eveMockApi.getAnchors().filter((a) => a.online);

    // 只在浏览主 Tab 时弹来电，避免在聊天/通话/详情页打断
    const tabHashes = ["#/", "#/match", "#/moments", "#/messages", "#/mine"];
    const isBrowsing = () => tabHashes.includes(location.hash || "#/");

    // 约 45s 模拟一次随机来电（仅浏览态）
    const callTimer = window.setInterval(() => {
      if (document.hidden || !isBrowsing()) return;
      const anchor = pickRandom(anchors);
      if (anchor) emitter.emit("call:incoming", { anchor, free: Math.random() < 0.3 });
    }, 45000);

    // 约 12s 模拟一条新私信
    const msgTimer = window.setInterval(() => {
      if (document.hidden) return;
      const anchor = pickRandom(anchors);
      if (anchor) {
        emitter.emit("message:new", {
          fromId: anchor.id,
          text: pickRandom(["Hi 👋", "Are you there?", "Miss you~", "Let's talk tonight"])
        });
      }
    }, 12000);

    const gifts: Gift[] = eveMockApi.getGifts();
    // 约 40s 模拟一次随机礼物（驱动全屏礼物动画，仅浏览态）
    const giftTimer = window.setInterval(() => {
      if (document.hidden || !isBrowsing()) return;
      const anchor = pickRandom(anchors);
      const gift = pickRandom(gifts);
      if (anchor && gift) emitter.emit("gift:received", { fromId: anchor.id, giftId: gift.id, count: 1 });
    }, 40000);

    timers = [callTimer, msgTimer, giftTimer];
  },

  stop() {
    timers.forEach((t) => window.clearInterval(t));
    timers = [];
    started = false;
  }
};
