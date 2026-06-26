<template>
  <header class="topbar">
    <button class="back" @click="router.back()">
      <van-icon name="arrow-left" />
    </button>
    <h1 class="title">{{ title }}</h1>
    <div class="right">
      <slot />
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";

defineProps<{ title: string }>();

const router = useRouter();
</script>

<style scoped lang="scss">
.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  /* 总高 = 48 内容区 + 顶部安全区；border-box 下让安全区叠加而非吃掉内容高度 */
  height: calc(48px + env(safe-area-inset-top));
  padding: env(safe-area-inset-top) 12px 0;
  background: #2c1a1a;
}

.back {
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 20px;
}

.title {
  flex: 1;
  text-align: center;
  font-size: 17px;
  font-weight: 600;
  color: #fff;
}

.right {
  flex: 0 0 auto;
  min-width: 32px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  font-size: 14px;
  color: #ffd36e;
}
</style>
