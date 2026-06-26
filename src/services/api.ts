import { eveMockApi } from "./eveMockApi";

// 异步接口门面：所有页面只依赖这一层（返回 Promise，模拟网络延迟）。
// mock 范围下数据来自 eveMockApi；真实接入阶段把每个方法替换为 HTTP 请求即可，
// 页面调用方无需改动。

const DELAY = 180;

function ok<T>(data: T, delay = DELAY): Promise<T> {
  return new Promise((resolve) => window.setTimeout(() => resolve(data), delay));
}

export const api = {
  // 主播 / 用户
  getAnchors: () => ok(eveMockApi.getAnchors()),
  getFollowing: () => ok(eveMockApi.getFollowing()),
  getAnchor: (id: number) => ok(eveMockApi.getAnchor(id)),
  getCurrentUser: () => ok(eveMockApi.getCurrentUser()),
  getVisitors: () => ok(eveMockApi.getVisitors()),
  getBlockedUsers: () => ok(eveMockApi.getBlockedUsers()),

  // 动态
  getMoments: () => ok(eveMockApi.getMoments()),
  getUserMoments: (id: number) => ok(eveMockApi.getUserMoments(id)),

  // 消息 / 通话
  getConversations: () => ok(eveMockApi.getConversations()),
  getCalls: () => ok(eveMockApi.getCalls()),
  getNotifications: () => ok(eveMockApi.getNotifications()),

  // 钱包 / 支付 / VIP
  getWalletPackages: () => ok(eveMockApi.getWalletPackages()),
  getWalletRecords: () => ok(eveMockApi.getWalletRecords()),
  getPaymentChannels: () => ok(eveMockApi.getPaymentChannels()),
  getVipPlans: () => ok(eveMockApi.getVipPlans()),

  // 签到 / 直播
  getSignDays: () => ok(eveMockApi.getSignDays()),
  getLiveRooms: () => ok(eveMockApi.getLiveRooms()),

  // 聊天 / 礼物 / 通话详情
  getChatMessages: (anchorId: number) => ok(eveMockApi.getChatMessages(anchorId)),
  getGifts: () => ok(eveMockApi.getGifts()),
  getCall: (id: number) => ok(eveMockApi.getCall(id)),
  translate: (text: string) => ok({ text: eveMockApi.translate(text) }),
  sendMessage: (anchorId: number, message: unknown) => ok({ ok: true, anchorId, message })
};

export type Api = typeof api;
