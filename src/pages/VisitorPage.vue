<template>
  <section class="page">
    <TopBar :title="t('visitor.title')" />

    <div v-if="visitors.length" class="list" :class="{ locked: !isVip }">
      <article v-for="a in visitors" :key="a.id" class="row" @click="open(a.id)">
        <div class="avatar-wrap">
          <van-image round fit="cover" class="avatar" :src="a.avatar" lazy-load />
          <span v-if="a.online" class="dot" />
        </div>
        <div class="body">
          <strong>{{ a.nickname }}</strong>
          <span class="id">ID: {{ a.id }}</span>
        </div>
        <div class="meta">
          <b>{{ t("visitor.visits", { count: (a.id % 3) + 1 }) }}</b>
          <span>{{ [t("visitor.time2m"), t("visitor.time1h"), t("visitor.timeYesterday"), t("visitor.time3d")][a.id % 4] }}</span>
        </div>
      </article>
    </div>
    <EmptyState v-else :text="t('visitor.empty')" />

    <!-- VIP 付费墙:非会员不可查看访客 -->
    <div v-if="!isVip && visitors.length" class="vip-lock">
      <div class="lock-card">
        <span class="lock-ico"><Lock :size="30" :stroke-width="1.8" /></span>
        <p class="lock-title">{{ t("visitor.vipLockTitle") }}</p>
        <p class="lock-sub">{{ t("visitor.vipLockSub", { count: visitors.length }) }}</p>
        <button class="get-vip" @click="router.push('/membership')">
          <Crown :size="17" :stroke-width="2" />{{ t("visitor.getVip") }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Lock, Crown } from "lucide-vue-next";
import TopBar from "../components/TopBar.vue";
import EmptyState from "../components/EmptyState.vue";
import { getVisitorList, type RelationUser } from "../services/relation";
import { useUserStore } from "../stores";

const { t } = useI18n();
const router = useRouter();
const userStore = useUserStore();
const isVip = computed(() => userStore.isVip);
const visitors = ref<RelationUser[]>([]);

function open(id: number) {
  if (!isVip.value) return; // 非会员锁定,不可进入
  router.push(`/anchor/${id}`);
}

onMounted(async () => {
  try {
    visitors.value = (await getVisitorList()).items;
  } catch {
    /* 加载失败:留空 */
  }
});
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: var(--eve-bg);
}
.list.locked {
  filter: blur(7px);
  pointer-events: none;
  user-select: none;
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
    color: var(--eve-faint);
  }
}
.meta {
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 3px;
  b {
    font-size: 13px;
    color: var(--eve-pink);
  }
  span {
    font-size: 12px;
    color: var(--eve-faint);
  }
}

.vip-lock {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  top: 0;
  bottom: 0;
  width: min(400PX, 100vw);
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 28px;
  background: rgba(11, 7, 18, 0.55);
}
.lock-card {
  width: 100%;
  padding: 28px 22px 24px;
  border-radius: 22px;
  background: linear-gradient(180deg, #1d142b, #0b0712);
  border: 1px solid var(--eve-line);
  text-align: center;

  .lock-ico {
    display: grid;
    place-items: center;
    width: 64px;
    height: 64px;
    margin: 0 auto 14px;
    border-radius: 50%;
    color: var(--eve-gold);
    background: rgba(255, 184, 0, 0.12);
    border: 1px solid rgba(255, 184, 0, 0.3);
  }
  .lock-title {
    font-size: 16px;
    font-weight: 700;
    color: #fff;
    line-height: 1.4;
  }
  .lock-sub {
    margin-top: 8px;
    font-size: 13px;
    color: var(--eve-muted);
  }
  .get-vip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    height: 48px;
    margin-top: 20px;
    border-radius: 24px;
    color: #1a1020;
    font-size: 15px;
    font-weight: 800;
    background: linear-gradient(135deg, #ffd36e, #ffb800);
    box-shadow: 0 8px 20px rgba(255, 184, 0, 0.35);
  }
}
</style>
