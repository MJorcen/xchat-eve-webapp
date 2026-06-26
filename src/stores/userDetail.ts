import { defineStore } from "pinia";

// 当前正在查看 / 通话 / 聊天的对方主播详情，跨页面共享，避免重复请求
export const useUserDetailStore = defineStore("userDetail", {
  state: () => ({
    userDetail: {} as Record<string, any>
  }),
  actions: {
    setUserDetail(detail: Record<string, any>) {
      this.userDetail = detail;
    },
    clear() {
      this.userDetail = {};
    }
  },
  persist: true
});
