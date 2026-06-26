<template>
  <section class="page">
    <TopBar title="Feedback" />

    <div class="field-wrap">
      <label><i>*</i> Content</label>
      <div class="field">
        <van-field
          v-model="content"
          type="textarea"
          rows="5"
          maxlength="200"
          show-word-limit
          placeholder="Describe your issue or suggestion…"
        />
      </div>
    </div>

    <div class="field-wrap">
      <label>Contact</label>
      <div class="field">
        <van-field v-model="contact" placeholder="Email or phone (optional)" />
      </div>
    </div>

    <button class="submit" @click="submit">Submit</button>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { showLoadingToast, closeToast, showToast } from "vant";
import TopBar from "../components/TopBar.vue";

const router = useRouter();
const content = ref("");
const contact = ref("");

function submit() {
  if (!content.value.trim()) {
    showToast("Please describe your issue");
    return;
  }
  showLoadingToast({ message: "Submitting…", forbidClick: true });
  window.setTimeout(() => {
    closeToast();
    showToast("Thanks for your feedback");
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
