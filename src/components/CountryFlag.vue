<template>
  <span v-if="emoji" class="country-flag" :style="sizeStyle" role="img" :aria-label="region || undefined">{{ emoji }}</span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { countryFlag } from "../utils/assets";

const props = defineProps<{ region?: string; size?: number | string }>();

const emoji = computed(() => countryFlag(props.region));
const sizeStyle = computed(() => {
  if (props.size == null) return undefined;
  const fs = typeof props.size === "number" ? `${props.size}px` : props.size;
  return { fontSize: fs };
});
</script>

<style scoped>
.country-flag {
  line-height: 1;
  font-style: normal;
  vertical-align: middle;
}
</style>
