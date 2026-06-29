<template>
  <section class="page">
    <TopBar :title="user?.nickname || t('userDynamic.moment')" />

    <div v-if="user" class="profile">
      <van-image round fit="cover" class="avatar" :src="user.avatar" lazy-load />
      <div class="info">
        <div class="name-row">
          <strong>{{ user.nickname }}</strong>
          <img class="flag" :src="countryFlag(user.region)" alt="" />
        </div>
        <span class="id">ID: {{ user.id }}</span>
        <span class="sub">{{ user.region.toUpperCase() }} · {{ user.age }} · {{ user.followers }} {{ t("userDynamic.followers") }}</span>
      </div>
      <button class="follow" :class="{ on: followed }" :disabled="followBusy" @click="toggleFollow">
        {{ followed ? t("common.following") : t("userDynamic.followCta") }}
      </button>
    </div>

    <div v-if="moments.length" class="feed">
      <MomentCard v-for="m in moments" :key="m.id" :moment="m" :show-follow="false" />
    </div>
    <EmptyState v-else :text="t('userDynamic.noMoments')" />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import MomentCard from "../components/MomentCard.vue";
import TopBar from "../components/TopBar.vue";
import EmptyState from "../components/EmptyState.vue";
import { api } from "../services/api";
import { fetchAnchorCard } from "../services/anchor";
import { getUserMomentsPage } from "../services/moment";
import { followUser, unfollowUser, isFollowing } from "../services/relation";
import { countryFlag } from "../utils/assets";
import type { Anchor, Moment } from "../types/eve";

const { t } = useI18n();
const route = useRoute();
const id = Number(route.params.id);
const user = ref<Anchor | null>(null);
const moments = ref<Moment[]>([]);
const followed = ref(false);
const followBusy = ref(false);

async function toggleFollow() {
  if (followBusy.value) return;
  followBusy.value = true;
  const was = followed.value;
  followed.value = !was;
  try {
    const status = was ? await unfollowUser(id) : await followUser(id);
    followed.value = isFollowing(status);
  } catch {
    followed.value = was;
  } finally {
    followBusy.value = false;
  }
}

onMounted(async () => {
  const [a, mp] = await Promise.all([
    api.getAnchor(id),
    getUserMomentsPage(id, 0, 30).catch(() => ({ items: [], total: 0 }))
  ]);
  user.value = a;
  moments.value = mp.items;
  // 头部身份 + 关注态用真实大卡覆盖(失败则保留 mock)
  fetchAnchorCard(id)
    .then(({ overlay, relationStatus }) => {
      if (user.value) user.value = { ...user.value, ...overlay };
      followed.value = isFollowing(relationStatus);
    })
    .catch(() => {});
});
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding-bottom: 84px;
  background: var(--eve-bg);
}
.profile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--eve-surface);
  border-bottom: 8px solid var(--eve-line);
  .avatar {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    overflow: hidden;
    flex: 0 0 auto;
  }
  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .name-row {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    strong {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .flag {
      flex: 0 0 auto;
      width: 18px;
      height: 13px;
      border-radius: 2px;
    }
  }
  .id,
  .sub {
    font-size: 12px;
    color: var(--eve-faint);
  }
  .follow {
    flex: 0 0 auto;
    height: 28px;
    padding: 0 14px;
    border-radius: 14px;
    font-size: 12px;
    font-weight: 600;
    color: #fff;
    background: var(--eve-pink);
    &.on {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.4);
      color: var(--eve-muted);
    }
  }
}
</style>
