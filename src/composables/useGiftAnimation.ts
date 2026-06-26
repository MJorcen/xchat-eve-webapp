import { reactive } from "vue";
import type { Gift } from "@/types/eve";

// 全屏礼物动画的播放队列（mock：CSS 动画替代参考里的 SVGA 播放器）。
// GiftPanel 直接 play()，GiftAnimation.vue 订阅 state.current 渲染。
type PlayItem = { gift: Gift; count: number; fromSelf: boolean };

const state = reactive({
  current: null as PlayItem | null,
  queue: [] as PlayItem[]
});

let playing = false;

function next() {
  if (playing) return;
  const item = state.queue.shift();
  if (!item) {
    state.current = null;
    return;
  }
  playing = true;
  state.current = item;
  window.setTimeout(() => {
    state.current = null;
    playing = false;
    next();
  }, 1800);
}

export function useGiftAnimation() {
  return {
    state,
    play(gift: Gift, count = 1, fromSelf = true) {
      state.queue.push({ gift, count, fromSelf });
      next();
    }
  };
}
