import { defineStore } from "pinia";
import type { NotificationItem } from "@/types/eve";

// 系统公告本地累积(NIM 自定义系统通知只在线推送 + 有限 TTL 补投,没有服务端"查历史"接口,
// 所以由客户端边收边攒,持久化到本地当作"通知收件箱")。
const MAX_ITEMS = 50;

export const useNotificationStore = defineStore("notifications", {
  state: () => ({
    items: [] as NotificationItem[]
  }),
  actions: {
    push(item: NotificationItem) {
      if (this.items.some((n) => n.id === item.id)) return; // 重连补投可能重复,按 id 去重
      this.items.unshift(item);
      if (this.items.length > MAX_ITEMS) this.items.length = MAX_ITEMS;
    }
  },
  persist: true
});
