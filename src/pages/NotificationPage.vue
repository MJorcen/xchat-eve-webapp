<template>
  <section class="page">
    <TopBar :title="t('notification.title')" />

    <div class="tabs">
      <button :class="['tab', { active: tab === 'interaction' }]" @click="tab = 'interaction'">
        {{ t("notification.tabInteraction") }}<i />
      </button>
      <button :class="['tab', { active: tab === 'notice' }]" @click="tab = 'notice'">
        {{ t("notification.tabNotice") }}<i />
      </button>
    </div>

    <!-- 互动:谁赞了/关注了/看了你 -->
    <div v-if="tab === 'interaction'" class="ix-list">
      <article v-for="ix in interactions" :key="ix.user.id" class="ix" @click="router.push(`/anchor/${ix.user.id}`)">
        <van-image round fit="cover" class="ix-avatar" :src="ix.user.avatar" lazy-load />
        <div class="ix-body">
          <strong>{{ ix.user.nickname }}</strong>
          <span class="act">{{ ix.text }}</span>
        </div>
        <time>{{ ix.time }}</time>
      </article>
    </div>

    <!-- 系统通知 -->
    <div v-else class="list">
      <article v-for="n in notices" :key="n.id" class="item">
        <img class="badge" src="/assets/eve/logo.png" alt="" />
        <div class="bubble">
          <strong>{{ t(n.title) }}</strong>
          <p>{{ n.content }}</p>
          <time>{{ n.time }}</time>
        </div>
      </article>
      <EmptyState v-if="!notices.length" :text="t('notification.empty')" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import TopBar from "../components/TopBar.vue";
import EmptyState from "../components/EmptyState.vue";
import { api } from "../services/api";
import { useNotificationStore } from "../stores";
import type { Anchor } from "../types/eve";

const { t } = useI18n();
const router = useRouter();
const notificationStore = useNotificationStore();
const tab = ref<"interaction" | "notice">("interaction");
// 系统公告经 NIM 自定义系统通知实时推送累积在本地(见 App.vue initAnnouncementListener),
// 没有服务端历史接口,只能展示"从现在开始收到的"公告,不是完整历史。
const notices = computed(() => notificationStore.items);
const senders = ref<Anchor[]>([]);

const interactions = computed(() =>
  senders.value.map((user, i) => ({
    user,
    text: [t("notification.actLiked"), t("notification.actFollowed"), t("notification.actVisited")][i % 3],
    time: [t("visitor.time2m"), t("visitor.time1h"), t("visitor.timeYesterday"), t("visitor.time3d")][i % 4]
  }))
);

onMounted(async () => {
  senders.value = await api.getVisitors();
});
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: var(--eve-bg);
}

.tabs {
  display: flex;
  gap: 28px;
  padding: 10px 16px 4px;
}
.tab {
  position: relative;
  padding: 8px 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--eve-faint);
  i {
    position: absolute;
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
    width: 0;
    height: 3px;
    border-radius: 3px;
    background: var(--eve-grad);
    transition: width 0.2s;
  }
  &.active {
    color: #fff;
    i {
      width: 22px;
    }
  }
}

/* 互动列表 */
.ix {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--eve-line);
}
.ix-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  flex: 0 0 auto;
}
.ix-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  strong {
    font-size: 15px;
    font-weight: 700;
    color: #fff;
  }
  .act {
    font-size: 13px;
    color: var(--eve-pink);
  }
}
.ix time {
  font-size: 12px;
  color: var(--eve-faint);
  flex: 0 0 auto;
}

/* 系统通知 */
.list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.item {
  display: flex;
  align-items: flex-start;
}
.badge {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex: 0 0 auto;
}
.bubble {
  margin-left: 12px;
  padding: 14px 16px;
  background: var(--eve-surface);
  border: 1px solid var(--eve-line);
  border-radius: 16px;
  border-top-left-radius: 4px;
  strong {
    font-size: 15px;
    font-weight: 700;
    color: #fff;
  }
  p {
    margin: 6px 0 8px;
    font-size: 14px;
    line-height: 1.5;
    color: var(--eve-muted);
  }
  time {
    display: block;
    text-align: right;
    font-size: 12px;
    color: var(--eve-faint);
  }
}
</style>
