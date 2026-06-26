import mitt from "mitt";
import type { Anchor } from "@/types/eve";

// 全局事件总线。mock 范围下，原本由 WebSocket/IM 推送的事件改由本地模拟器发出，
// 页面与弹窗通过订阅这些事件来响应来电、礼物、新消息等。
export type AppEvents = {
  // 收到来电（模拟器或主播主页主动触发）
  "call:incoming": { anchor: Anchor; free?: boolean };
  // 通话结束（用于追加通话记录、跳转结算）
  "call:hangup": { anchor: Anchor; duration: number };
  // 收到他人礼物（驱动全屏礼物动画）
  "gift:received": { fromId: number; giftId: number; count: number };
  // 新私信
  "message:new": { fromId: number; text: string };
  // 全局轻提示
  "toast": string;
};

const emitter = mitt<AppEvents>();

export default emitter;
