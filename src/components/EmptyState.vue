<template>
  <div class="empty">
    <img src="/assets/eve/empty.png" alt="" />
    <p>{{ text }}</p>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ text?: string }>(), { text: "Nothing here yet" });
</script>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding-top: 100px;
}
.empty img {
  width: 120px;
  height: 120px;
  object-fit: contain;
  opacity: 0.85;
}
.empty p {
  font-size: 14px;
  color: #6f5b5b;
}
</style>
