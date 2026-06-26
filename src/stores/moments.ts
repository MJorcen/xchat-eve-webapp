import { defineStore } from "pinia";
import type { Moment } from "@/types/eve";

// 共享动态列表：新发布的动态 prepend 进来后能在 Moments feed 顶部出现（跨页面留存）
export const useMomentsStore = defineStore("moments", {
  state: () => ({
    list: [] as Moment[]
  }),
  actions: {
    seed(moments: Moment[]) {
      if (this.list.length === 0) this.list = [...moments];
    },
    prepend(m: Moment) {
      this.list.unshift(m);
      // 限制持久化体量(含 data URL 图片),避免无限增长撑爆 localStorage
      if (this.list.length > 40) this.list.length = 40;
    }
  },
  persist: true
});
