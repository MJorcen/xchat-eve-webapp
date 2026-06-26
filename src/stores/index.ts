import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

export { pinia };
export * from "./user";
export * from "./userDetail";
export * from "./vipConfig";
export * from "./moments";
