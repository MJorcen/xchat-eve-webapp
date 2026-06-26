import { defineStore } from "pinia";

// VIP / 充值套餐等全局配置，进入应用时拉取一次缓存
export const useVipConfigStore = defineStore("vipConfig", {
  state: () => ({
    vipConfigData: {} as Record<string, any>
  }),
  actions: {
    setVipConfigData(data: Record<string, any>) {
      this.vipConfigData = data;
    }
  },
  persist: true
});
