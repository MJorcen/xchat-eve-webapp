<template>
  <section class="page">
    <TopBar :title="t('feedbackPage.title')" />

    <div class="field-wrap">
      <label><i>*</i> {{ t("feedbackPage.content") }}</label>
      <div class="field">
        <van-field
          v-model="content"
          type="textarea"
          rows="5"
          maxlength="200"
          show-word-limit
          :placeholder="t('feedbackPage.contentPlaceholder')"
        />
      </div>
    </div>

    <div class="field-wrap">
      <label>{{ t("feedbackPage.contact") }}</label>
      <div class="field">
        <van-field v-model="contact" :placeholder="t('feedbackPage.contactPlaceholder')" />
      </div>
    </div>

    <button class="submit" @click="submit">{{ t("common.submit") }}</button>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { showLoadingToast, closeToast, showToast } from "vant";
import TopBar from "../components/TopBar.vue";

const { t } = useI18n();
const router = useRouter();
const content = ref("");
const contact = ref("");

function submit() {
  if (!content.value.trim()) {
    showToast(t("feedbackPage.emptyContent"));
    return;
  }
  showLoadingToast({ message: t("feedbackPage.submitting"), forbidClick: true });
  window.setTimeout(() => {
    closeToast();
    showToast(t("feedbackPage.thanks"));
    router.back();
  }, 700);
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding-bottom: 96px;
  background: #2c1a1a;
}
.field-wrap {
  padding: 16px 16px 0;
  label {
    display: block;
    margin-bottom: 8px;
    font-size: 15px;
    color: #fff;
    i {
      color: #ff5473;
      font-style: normal;
    }
  }
}
.field {
  border-radius: 12px;
  background: #3a2526;
  overflow: hidden;
  :deep(.van-field) {
    background: transparent;
  }
  :deep(.van-field__control) {
    color: #fff;
  }
  :deep(.van-field__control::placeholder) {
    color: #9a8b8b;
  }
  :deep(.van-field__word-limit) {
    color: #9a8b8b;
  }
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
  background: #eb6300;
}
</style>
