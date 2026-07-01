import { createApp } from "vue";
import "@/utils/rem";
import vant, { Lazyload } from "vant";
import "vant/lib/index.css";
import App from "./App.vue";
import { router } from "./router";
import { pinia } from "@/stores";
import { useUserStore } from "@/stores";
import { i18n } from "@/i18n";
import "./style.css";

const app = createApp(App);

app.use(router);
app.use(pinia);
app.use(i18n);
app.use(vant);
app.use(Lazyload);

// 用持久化的语言偏好初始化 i18n
i18n.global.locale.value = useUserStore().lang;

// 屏蔽模板告警噪音（mock 阶段）
app.config.warnHandler = () => null;

app.mount("#app");

// 来电/新消息已走真实网易云信(见 startCallSignals / onMessages),不再启动 mock 实时层。
// 旧的 realtime.start() 会每 ~45s 弹假来电(Ava/Lina/Mira,eveId=0),干扰真实通话与占用锁 —— 已移除。

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js");
  });
}
