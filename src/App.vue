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
import { useUserStore } from "./stores";

const route = useRoute();
const userStore = useUserStore();
const showTabbar = computed(() => tabRouteNames.includes(String(route.name)));
// 5 个 Tab 页缓存,切换不重载、保留状态与滚动
const keepAliveTabs = ["HomePage", "MatchPage", "MomentsPage", "MessagesPage", "MinePage"];

// 已登录:拉真实资料(大卡)+ 登录 NIM 并注册 eve 通话信令监听(全局接来电)。
function initLoggedIn() {
  hydrateCurrentUser();
  void startCallSignals();
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
