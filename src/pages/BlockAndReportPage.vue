<template>
  <section class="page">
    <TopBar title="Block & Report" />

    <p class="hint">Select a reason for reporting this user.</p>
    <div class="reasons">
      <button
        v-for="r in reasons"
        :key="r"
        class="reason"
        :class="{ on: selected === r }"
        @click="selected = r"
      >
        <span>{{ r }}</span>
        <span class="radio" :class="{ on: selected === r }" />
      </button>
    </div>

    <div class="block-row">
      <span>Block this user too</span>
      <van-switch v-model="alsoBlock" size="22px" active-color="#eb6300" inactive-color="#3a2526" />
    </div>

    <button class="submit" :disabled="!selected" @click="submit">Submit</button>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { showLoadingToast, closeToast, showToast } from "vant";
import TopBar from "../components/TopBar.vue";

const route = useRoute();
const router = useRouter();
// 被举报用户 id(由 AnchorDetail / MatchDetail 通过 ?id 传入)
const targetId = Number(route.query.id) || 0;
const selected = ref("");
const alsoBlock = ref(false);
const reasons = [
  "Pornographic / vulgar",
  "Fraud / scam",
  "Harassment / abuse",
  "Underage",
  "Impersonation / fake profile",
  "Advertising / spam",
  "Other"
];

function submit() {
  if (!selected.value) return;
  showLoadingToast({ message: "Submitting…", forbidClick: true });
  window.setTimeout(() => {
    // mock:针对 targetId 提交举报(+可选拉黑)
    closeToast();
    showToast(alsoBlock.value && targetId ? "Reported & blocked" : "Report submitted");
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
.hint {
  padding: 16px;
  font-size: 13px;
  color: #9a8b8b;
}
.reason {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 14px 16px;
  border-bottom: 1px solid #241213;
  font-size: 15px;
  color: #fff;
  text-align: left;
  .radio {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid #6b5656;
    position: relative;
    &.on {
      border-color: #eb6300;
      &::after {
        content: "";
        position: absolute;
        inset: 3px;
        border-radius: 50%;
        background: #eb6300;
      }
    }
  }
}
.block-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  font-size: 14px;
  color: #ece4e4;
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
  &:disabled {
    background: #3a2526;
    color: #9a8b8b;
  }
}
</style>
