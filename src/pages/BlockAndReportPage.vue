<template>
  <section class="page">
    <TopBar :title="t('report.title')" />

    <p class="hint">{{ t("report.hint") }}</p>
    <div class="reasons">
      <button
        v-for="r in reasons"
        :key="r.key"
        class="reason"
        :class="{ on: selected === r.key }"
        @click="selected = r.key"
      >
        <span>{{ t(r.label) }}</span>
        <span class="radio" :class="{ on: selected === r.key }" />
      </button>
    </div>

    <!-- 问题描述(必填) -->
    <div class="field-wrap">
      <label><i>*</i> {{ t("report.descLabel") }}</label>
      <div class="field">
        <van-field
          v-model="desc"
          type="textarea"
          rows="4"
          maxlength="200"
          show-word-limit
          :placeholder="t('report.descPlaceholder')"
        />
      </div>
    </div>

    <!-- 凭证上传 -->
    <div class="field-wrap">
      <label>{{ t("report.uploadLabel") }}</label>
      <van-uploader v-model="pics" multiple :max-count="6" accept="image/*" class="uploader" />
    </div>

    <div class="block-row">
      <span>{{ t("report.blockToo") }}</span>
      <van-switch v-model="alsoBlock" size="22px" active-color="#ff2a7a" inactive-color="#2a1f3d" />
    </div>

    <button class="submit" :disabled="!desc.trim()" @click="submit">{{ t("common.submit") }}</button>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { showLoadingToast, closeToast, showToast } from "vant";
import type { UploaderFileListItem } from "vant";
import TopBar from "../components/TopBar.vue";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
// 被举报用户 id(由 AnchorDetail / MatchDetail 通过 ?id 传入)
const targetId = Number(route.query.id) || 0;
const selected = ref("");
const desc = ref("");
const pics = ref<UploaderFileListItem[]>([]);
const alsoBlock = ref(false);
const reasons = [
  { key: "pornographic", label: "report.reasonPornographic" },
  { key: "fraud", label: "report.reasonFraud" },
  { key: "harassment", label: "report.reasonHarassment" },
  { key: "underage", label: "report.reasonUnderage" },
  { key: "impersonation", label: "report.reasonImpersonation" },
  { key: "advertising", label: "report.reasonAdvertising" },
  { key: "other", label: "report.reasonOther" }
];

function submit() {
  if (!desc.value.trim()) {
    showToast(t("report.emptyDesc"));
    return;
  }
  showLoadingToast({ message: t("report.submitting"), forbidClick: true });
  window.setTimeout(() => {
    // mock:针对 targetId 提交举报(+可选拉黑)
    closeToast();
    showToast(alsoBlock.value && targetId ? t("report.reportedBlocked") : t("report.reportSubmitted"));
    router.back();
  }, 700);
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding-bottom: 96px;
  background: var(--eve-bg);
}
.hint {
  padding: 16px;
  font-size: 13px;
  color: var(--eve-muted);
}
.reason {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 14px 16px;
  border-bottom: 1px solid var(--eve-line);
  font-size: 15px;
  color: #fff;
  text-align: left;
  .radio {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid var(--eve-faint);
    position: relative;
    &.on {
      border-color: var(--eve-pink);
      &::after {
        content: "";
        position: absolute;
        inset: 3px;
        border-radius: 50%;
        background: var(--eve-pink);
      }
    }
  }
}
.field-wrap {
  padding: 16px 16px 0;
  label {
    display: block;
    margin-bottom: 8px;
    font-size: 15px;
    color: #fff;
    i {
      color: var(--eve-pink);
      font-style: normal;
    }
  }
}
.field {
  border-radius: 12px;
  background: var(--eve-surface);
  border: 1px solid var(--eve-line);
  overflow: hidden;
  :deep(.van-field) {
    background: transparent;
  }
  :deep(.van-field__control) {
    color: #fff;
  }
  :deep(.van-field__control::placeholder) {
    color: var(--eve-faint);
  }
  :deep(.van-field__word-limit) {
    color: var(--eve-faint);
  }
}
.uploader {
  :deep(.van-uploader__upload) {
    background: var(--eve-surface);
    border: 1px solid var(--eve-line);
    border-radius: 12px;
  }
  :deep(.van-uploader__upload-icon) {
    color: var(--eve-faint);
  }
  :deep(.van-uploader__preview-image) {
    border-radius: 12px;
  }
}
.block-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 16px 0;
  font-size: 14px;
  color: var(--eve-text);
}
.submit {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;
  width: min(400PX, 100vw);
  padding: 14px 16px calc(14px + env(safe-area-inset-bottom));
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  background: var(--eve-grad);
  &:disabled {
    background: var(--eve-surface);
    color: var(--eve-faint);
  }
}
</style>
