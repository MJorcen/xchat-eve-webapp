import { createPinia } from "pinia";
import { createPersistedState } from "pinia-plugin-persistedstate";

// 安全存储:localStorage 写入超额(QuotaExceededError)时静默降级为"不持久化",
// 避免异常冒泡污染其它 store(否则余额/资料的后续写入也会一起失败)。
const safeStorage = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("[persist] skipped (storage full)", e);
    }
  },
  removeItem: (key: string) => localStorage.removeItem(key)
};

const pinia = createPinia();
pinia.use(createPersistedState({ storage: safeStorage }));

export { pinia };
export * from "./user";
export * from "./userDetail";
export * from "./vipConfig";
export * from "./moments";
export * from "./notifications";
