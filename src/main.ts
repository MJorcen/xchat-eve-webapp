import { createApp } from "vue";
import "@/utils/rem";
import vant, { Lazyload } from "vant";
import "vant/lib/index.css";
import App from "./App.vue";
import { router } from "./router";
import { pinia } from "@/stores";
import { realtime } from "@/services/realtime";
import "./style.css";

const app = createApp(App);

app.use(router);
app.use(pinia);
app.use(vant);
app.use(Lazyload);

// 屏蔽模板告警噪音（mock 阶段）
app.config.warnHandler = () => null;

app.mount("#app");

// 启动 mock 实时层（来电 / 新消息等推送模拟）
realtime.start();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js");
  });
}
