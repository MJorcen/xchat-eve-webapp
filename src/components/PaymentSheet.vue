<template>
  <van-popup
    :show="show"
    position="bottom"
    round
    teleport="body"
    class="sheet-shell"
    :z-index="3600"
    @update:show="(v: boolean) => emit('update:show', v)"
  >
    <div class="pay-sheet">
      <header class="ps-head">
        <strong>{{ title }}</strong>
        <button class="ps-close" @click="emit('update:show', false)"><X :size="20" :stroke-width="2" /></button>
      </header>

      <p class="ps-amount">{{ amount }}</p>

      <div class="ps-channels">
        <button
          v-for="c in visible"
          :key="c.id"
          class="ps-ch"
          :class="{ on: sel === c.id }"
          @click="sel = c.id"
        >
          <i class="mark">{{ c.mark }}</i>
          <div class="info">
            <strong>
              <span class="cname">{{ c.name }}</span>
              <b v-if="c.recommended" class="rec">{{ t("payment.recommended") }}</b>
            </strong>
            <span class="desc">{{ c.description }}</span>
          </div>
          <span class="radio" :class="{ on: sel === c.id }" />
        </button>
      </div>

      <button v-if="channels.length > 2 && !expanded" class="ps-more" @click="expanded = true">
        {{ t("payment.more") }} ▾
      </button>

      <button class="ps-pay" :disabled="!sel" @click="onPay">{{ t("payment.pay", { price: amount }) }}</button>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { X } from "lucide-vue-next";
import { api } from "../services/api";
import type { PaymentChannel } from "../types/eve";

const props = defineProps<{ show: boolean; title: string; amount: string }>();
const emit = defineEmits<{ "update:show": [boolean]; pay: [PaymentChannel] }>();

const { t } = useI18n();
const channels = ref<PaymentChannel[]>([]);
const sel = ref("");
const expanded = ref(false);

const visible = computed(() => (expanded.value ? channels.value : channels.value.slice(0, 2)));

// 每次打开重置展开态
watch(
  () => props.show,
  (v) => {
    if (v) expanded.value = false;
  }
);

function onPay() {
  const c = channels.value.find((x) => x.id === sel.value);
  if (c) emit("pay", c);
}

onMounted(async () => {
  channels.value = await api.getPaymentChannels();
  sel.value = channels.value.find((c) => c.recommended)?.id || channels.value[0]?.id || "";
});
</script>

<style scoped lang="scss">
.pay-sheet {
  padding: 18px 16px calc(16px + env(safe-area-inset-bottom));
  background: var(--eve-surface);
  border-top: 1px solid var(--eve-line);
}

.ps-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  strong {
    font-size: 16px;
    font-weight: 800;
    color: #fff;
  }
  .ps-close {
    color: var(--eve-faint);
  }
}

.ps-amount {
  margin: 4px 0 16px;
  font-size: 28px;
  font-weight: 800;
  color: var(--eve-gold);
}

.ps-channels {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ps-ch {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 14px;
  border-radius: 14px;
  background: var(--eve-bg);
  border: 1.5px solid var(--eve-line);
  text-align: left;

  &.on {
    border-color: var(--eve-pink);
    background: rgba(255, 42, 122, 0.08);
  }
  .mark {
    flex: 0 0 auto;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    font-size: 12px;
    font-weight: 700;
    font-style: normal;
    color: #fff;
    background: var(--eve-grad);
  }
  .info {
    flex: 1;
    min-width: 0;
    strong {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      column-gap: 6px;
      row-gap: 3px;
      font-size: 14px;
      color: #fff;
      .cname {
        white-space: nowrap;
      }
      .rec {
        font-size: 10px;
        font-weight: 600;
        padding: 1px 7px;
        border-radius: 99px;
        color: #fff;
        background: var(--eve-grad);
      }
    }
    .desc {
      display: block;
      margin-top: 2px;
      font-size: 11px;
      color: var(--eve-faint);
    }
  }
  .radio {
    flex: 0 0 auto;
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

.ps-more {
  width: 100%;
  margin-top: 12px;
  font-size: 13px;
  color: var(--eve-muted);
}

.ps-pay {
  width: 100%;
  height: 50px;
  margin-top: 18px;
  border-radius: 25px;
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  background: var(--eve-grad);
  box-shadow: var(--eve-glow-pink);
  &:disabled {
    opacity: 0.5;
    box-shadow: none;
  }
}
</style>
