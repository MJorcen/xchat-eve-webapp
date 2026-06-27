<template>
  <section class="page">
    <TopBar :title="t('blockListPage.title')" />
    <div v-if="blocked.length" class="list">
      <article v-for="a in blocked" :key="a.id" class="row">
        <van-image round fit="cover" class="avatar" :src="a.avatar" lazy-load />
        <div class="body">
          <strong>{{ a.nickname }}</strong>
          <span class="id">ID: {{ a.id }}</span>
        </div>
        <button class="unblock" @click="unblock(a.id)">{{ t("blockListPage.unblock") }}</button>
      </article>
    </div>
    <EmptyState v-else :text="t('blockListPage.empty')" />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { showLoadingToast, closeToast, showToast } from "vant";
import TopBar from "../components/TopBar.vue";
import EmptyState from "../components/EmptyState.vue";
import { api } from "../services/api";
import type { Anchor } from "../types/eve";

const { t } = useI18n();
const blocked = ref<Anchor[]>([]);

function unblock(id: number) {
  showLoadingToast({ message: t("blockListPage.pleaseWait"), forbidClick: true });
  window.setTimeout(() => {
    blocked.value = blocked.value.filter((a) => a.id !== id);
    closeToast();
    showToast(t("blockListPage.unblocked"));
  }, 600);
}

onMounted(async () => (blocked.value = [...(await api.getBlockedUsers())]));
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #2c1a1a;
}
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #241213;
}
.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  flex: 0 0 auto;
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
    color: #eb6300;
  }
}
.unblock {
  flex: 0 0 auto;
  padding: 6px 16px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(90deg, #ff5473, #eb6300);
}
</style>
