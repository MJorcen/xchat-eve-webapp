<template>
  <!-- grid: 主播照片栅格占位 -->
  <div v-if="type === 'grid'" class="sk-grid">
    <div v-for="i in count" :key="i" class="sk-card sk" />
  </div>

  <!-- list: 头像行占位 -->
  <div v-else class="sk-list">
    <div v-for="i in count" :key="i" class="sk-row">
      <div class="sk-avatar sk" />
      <div class="sk-lines">
        <div class="sk-line sk w70" />
        <div class="sk-line sk w45" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ type?: "grid" | "list"; count?: number }>(), {
  type: "list",
  count: 6
});
</script>

<style scoped lang="scss">
.sk {
  background: linear-gradient(90deg, #181226 25%, #251a3a 37%, #181226 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}
@keyframes shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}

.sk-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  padding: 6px 16px 0;
}
.sk-card {
  aspect-ratio: 3 / 4;
  border-radius: 16px;
}

.sk-list {
  padding: 6px 16px;
}
.sk-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
}
.sk-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  flex: 0 0 auto;
}
.sk-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sk-line {
  height: 12px;
  border-radius: 6px;
}
.w70 {
  width: 70%;
}
.w45 {
  width: 45%;
}
</style>
