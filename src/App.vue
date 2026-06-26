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
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { RouterView, useRoute } from "vue-router";
import AppTabbar from "./components/AppTabbar.vue";
import CallModal from "./components/CallModal.vue";
import GiftAnimation from "./components/GiftAnimation.vue";
import TopNotification from "./components/TopNotification.vue";
import { tabRouteNames } from "./router";
import { api } from "./services/api";
import { useUserStore } from "./stores";

const route = useRoute();
const userStore = useUserStore();
const showTabbar = computed(() => tabRouteNames.includes(String(route.name)));
// 5 个 Tab 页缓存,切换不重载、保留状态与滚动
const keepAliveTabs = ["HomePage", "MatchPage", "MomentsPage", "MessagesPage", "MinePage"];

// 启动时把当前用户载入 store（金币余额的唯一来源，供充值/礼物/通话计费共享）
onMounted(async () => {
  if (!userStore.user.id) {
    userStore.setUser(await api.getCurrentUser());
  }
});
</script>
