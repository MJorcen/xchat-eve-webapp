import { defineStore } from "pinia";
import type { CurrentUser } from "@/types/eve";

// 当前登录用户（mock 范围下来自 mock 服务，可被充值/编辑资料更新）
export const useUserStore = defineStore("user", {
  state: () => ({
    user: {} as Partial<CurrentUser>,
    token: "" as string,
    // 已领取的签到日（持久化，防止刷新/重进重复领取）
    claimedSignDays: [] as number[]
  }),
  getters: {
    coins: (state) => state.user.coins ?? 0,
    isVip: (state) => (state.user.vipLevel ?? 0) > 0,
    isLogin: (state) => !!state.token
  },
  actions: {
    setUser(user: Partial<CurrentUser>) {
      this.user = { ...this.user, ...user };
    },
    setToken(token: string) {
      this.token = token;
    },
    addCoins(delta: number) {
      this.user.coins = (this.user.coins ?? 0) + delta;
    },
    claimSignDay(day: number) {
      if (!this.claimedSignDays.includes(day)) this.claimedSignDays.push(day);
    },
    logout() {
      this.user = {};
      this.token = "";
    }
  },
  persist: true
});
