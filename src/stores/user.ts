import { defineStore } from "pinia";
import type { CurrentUser } from "@/types/eve";

// 当前登录用户（mock 范围下来自 mock 服务，可被充值/编辑资料更新）
export const useUserStore = defineStore("user", {
  state: () => ({
    user: {} as Partial<CurrentUser>,
    token: "" as string,
    // 网易云信 NIM 登录 token(登录响应 neteaskAuthToken;后端 = md5(userId))
    imToken: "" as string,
    // 首充弹窗只展示一次
    firstChargeSeen: false,
    // 界面语言
    lang: "en" as "en" | "zh"
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
    // 设备登录成功后写入登录态：token + 用户基础信息（合并，不清掉已有字段）+ 云信 imToken。
    setAuth(token: string, user?: Partial<CurrentUser>, imToken?: string) {
      this.token = token;
      if (user) this.user = { ...this.user, ...user };
      if (imToken) this.imToken = imToken;
    },
    addCoins(delta: number) {
      this.user.coins = (this.user.coins ?? 0) + delta;
    },
    setFirstChargeSeen() {
      this.firstChargeSeen = true;
    },
    setLang(lang: "en" | "zh") {
      this.lang = lang;
    },
    logout() {
      this.user = {};
      this.token = "";
      this.imToken = "";
    }
  },
  persist: true
});
