<template>
  <section class="page">
    <TopBar :title="t('followFans.title')" />

    <div class="tabs">
      <button :class="['tab', { active: tab === 0 }]" @click="tab = 0">{{ t("common.following") }}<i /></button>
      <button :class="['tab', { active: tab === 1 }]" @click="tab = 1">{{ t("followFans.fans") }}<i /></button>
    </div>

    <div class="list">
      <template v-if="current.length">
        <article v-for="a in current" :key="a.id" class="row" @click="router.push(`/anchor/${a.id}`)">
          <div class="avatar-wrap">
            <van-image round fit="cover" class="avatar" :src="a.avatar" lazy-load />
            <span v-if="a.online" class="dot" />
          </div>
          <div class="body">
            <strong>{{ a.nickname }}</strong>
            <span class="id">ID: {{ a.id }}</span>
          </div>
          <button
            class="follow-btn"
            :class="{ followed: isFollowing(a.relationStatus) }"
            :disabled="a.busy"
            @click.stop="toggle(a)"
          >
            {{ isFollowing(a.relationStatus) ? t("common.following") : t("common.follow") }}
          </button>
        </article>
      </template>
      <EmptyState v-else :text="tab === 0 ? t('followFans.emptyFollowing') : t('followFans.emptyFans')" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { showToast } from "vant";
import TopBar from "../components/TopBar.vue";
import EmptyState from "../components/EmptyState.vue";
import { getFollowingList, getFansList, followUser, unfollowUser, isFollowing, type RelationUser } from "../services/relation";
import { ApiError } from "../services/http";
import { useUserStore } from "../stores";

type Row = RelationUser & { busy?: boolean };

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const tab = ref(route.query.type === "followers" ? 1 : 0);
const following = ref<Row[]>([]);
const fans = ref<Row[]>([]);
const current = computed(() => (tab.value === 0 ? following.value : fans.value));

onMounted(async () => {
  const [f, fa] = await Promise.all([
    getFollowingList().catch(() => ({ items: [], total: 0 })),
    getFansList().catch(() => ({ items: [], total: 0 }))
  ]);
  following.value = f.items;
  fans.value = fa.items;
});

// 关注/取关：调真实接口，按返回的 relationStatus 翻转按钮，并同步我的关注数。
async function toggle(a: Row) {
  if (a.busy) return;
  a.busy = true;
  const wasFollowing = isFollowing(a.relationStatus);
  try {
    a.relationStatus = wasFollowing ? await unfollowUser(a.id) : await followUser(a.id);
    const nowFollowing = isFollowing(a.relationStatus);
    if (nowFollowing !== wasFollowing) {
      const delta = nowFollowing ? 1 : -1;
      userStore.setUser({ following: Math.max(0, (userStore.user.following ?? 0) + delta) });
    }
  } catch (e) {
    showToast(e instanceof ApiError ? e.message : t("followFans.actionFailed"));
  } finally {
    a.busy = false;
  }
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: var(--eve-bg);
}
.tabs {
  display: flex;
  border-bottom: 1px solid var(--eve-line);
}
.tab {
  position: relative;
  flex: 1;
  padding: 14px 0;
  font-size: 15px;
  color: var(--eve-faint);
  i {
    position: absolute;
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
    width: 24px;
    height: 3px;
    border-radius: 3px;
    background: transparent;
  }
  &.active {
    color: #fff;
    font-weight: 600;
    i {
      background: var(--eve-grad);
    }
  }
}
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--eve-line);
}
.avatar-wrap {
  position: relative;
  flex: 0 0 auto;
}
.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
}
.dot {
  position: absolute;
  right: 1px;
  bottom: 1px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--eve-green);
  border: 2px solid var(--eve-bg);
}
.body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  strong {
    font-size: 16px;
    font-weight: 600;
    color: #fff;
  }
  .id {
    font-size: 13px;
    color: var(--eve-pink);
  }
}
.follow-btn {
  flex: 0 0 auto;
  min-width: 76px;
  padding: 7px 14px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: var(--eve-grad);
  &:active {
    transform: scale(0.96);
  }
  &:disabled {
    opacity: 0.6;
  }
  /* 已关注:描边态 */
  &.followed {
    color: var(--eve-faint);
    background: transparent;
    border: 1px solid var(--eve-line);
  }
}
</style>
