<template>
  <main class="phone-shell dark">
    <RouterView v-slot="{ Component }">
      <KeepAlive :include="keepAliveTabs">
        <component :is="Component" />
      </KeepAlive>
    </RouterView>
    <AppTabbar v-if="showTabbar" />
    <CallModal />
    <GiftAnimation />
    <TopNotification />
    <FirstChargePopup />
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { RouterView, useRoute } from "vue-router";
import AppTabbar from "./components/AppTabbar.vue";
import CallModal from "./components/CallModal.vue";
import GiftAnimation from "./components/GiftAnimation.vue";
import TopNotification from "./components/TopNotification.vue";
import FirstChargePopup from "./components/FirstChargePopup.vue";
import { tabRouteNames } from "./router";
import { hydrateCurrentUser } from "./services/auth";
import { startCallSignals } from "./composables/useCall";
import { ensureImLogin, onAnnouncement } from "./services/im";
import { useUserStore, useNotificationStore } from "./stores";
import type { NotificationItem } from "./types/eve";

const route = useRoute();
const userStore = useUserStore();
const notificationStore = useNotificationStore();
const showTabbar = computed(() => tabRouteNames.includes(String(route.name)));
// 5 个 Tab 页缓存,切换不重载、保留状态与滚动
const keepAliveTabs = ["HomePage", "MatchPage", "MomentsPage", "MessagesPage", "MinePage"];

let announcementListenerReady = false;

// 系统公告(送礼/游戏胜利/宠物升级/战力第一等)只在线推送,没有服务端历史查询接口,
// 边收边攒进本地收件箱(NotificationPage "通知" tab 展示)。只注册一次。
function initAnnouncementListener() {
  if (announcementListenerReady) return;
  announcementListenerReady = true;
  ensureImLogin()
    .then(() => {
      onAnnouncement((a) => {
        const title =
          a.type === 1 ? "notification.typeGift" : a.type === 2 ? "notification.typeGame" : a.type === 3 ? "notification.typePet" : a.type === 4 ? "notification.typeRankTop1" : "notification.tabNotice";
        const d = new Date(a.createdAt);
        const item: NotificationItem = {
          id: a.id,
          title,
          content: a.text,
          time: `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
        };
        notificationStore.push(item);
      });
    })
    .catch(() => {
      announcementListenerReady = false; // NIM 未就绪,允许下次 initLoggedIn 重试
    });
}

// 已登录:拉真实资料(大卡)+ 登录 NIM 并注册 eve 通话信令 / 系统公告监听(全局接来电/通知)。
function initLoggedIn() {
  hydrateCurrentUser();
  void startCallSignals();
  initAnnouncementListener();
}
// 持久化会话/刷新
onMounted(() => {
  if (userStore.isLogin) initLoggedIn();
});
// 新登录(/login → 登录成功后 isLogin 变 true)
watch(
  () => userStore.isLogin,
  (v) => {
    if (v) initLoggedIn();
  }
);
</script>
