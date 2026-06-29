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
        <button class="unblock" :disabled="removing.has(a.id)" @click="unblock(a.id)">{{ t("blockListPage.unblock") }}</button>
      </article>
    </div>
    <EmptyState v-else :text="t('blockListPage.empty')" />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { showToast } from "vant";
import TopBar from "../components/TopBar.vue";
import EmptyState from "../components/EmptyState.vue";
import { getBlockedList, unblockUser, type RelationUser } from "../services/relation";
import { ApiError } from "../services/http";

const { t } = useI18n();
const blocked = ref<RelationUser[]>([]);
const removing = ref<Set<number>>(new Set());

async function unblock(id: number) {
  if (removing.value.has(id)) return;
  removing.value.add(id);
  try {
    await unblockUser(id);
    blocked.value = blocked.value.filter((a) => a.id !== id);
    showToast(t("blockListPage.unblocked"));
  } catch (e) {
    showToast(e instanceof ApiError ? e.message : t("followFans.actionFailed"));
  } finally {
    removing.value.delete(id);
  }
}

onMounted(async () => {
  try {
    blocked.value = (await getBlockedList()).items;
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
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--eve-line);
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
    color: var(--eve-pink);
  }
}
.unblock {
  flex: 0 0 auto;
  padding: 6px 16px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: var(--eve-grad);
}
</style>
