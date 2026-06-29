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
import { computed, onMounted } from "vue";
import { RouterView, useRoute } from "vue-router";
import AppTabbar from "./components/AppTabbar.vue";
import CallModal from "./components/CallModal.vue";
import GiftAnimation from "./components/GiftAnimation.vue";
import TopNotification from "./components/TopNotification.vue";
import FirstChargePopup from "./components/FirstChargePopup.vue";
import { tabRouteNames } from "./router";
import { hydrateCurrentUser } from "./services/auth";
import { useUserStore } from "./stores";

const route = useRoute();
const userStore = useUserStore();
const showTabbar = computed(() => tabRouteNames.includes(String(route.name)));
// 5 个 Tab 页缓存,切换不重载、保留状态与滚动
const keepAliveTabs = ["HomePage", "MatchPage", "MomentsPage", "MessagesPage", "MinePage"];

// 启动时（持久化会话/刷新）若已登录，拉真实资料（大卡）写入 store；金币等卡片不含的字段由 mock 兜底。
// 登录态由路由守卫把关（未登录已跳登录页）。新登录的拉取在 LoginPage 内触发。
onMounted(() => {
  if (userStore.isLogin) hydrateCurrentUser();
});
</script>
