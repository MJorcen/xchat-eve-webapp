<template>
  <van-popup
    :show="show"
    position="bottom"
    round
    teleport="body"
    class="gift-popup"
    :z-index="2000"
    @update:show="(v: boolean) => emit('update:show', v)"
  >
    <div class="gift-panel">
      <div class="panel-head">
        <span class="title">Gifts</span>
        <span class="balance">
          <img src="/assets/eve/chatRoom/coin_16@2x.png" alt="" />
          {{ coins }}
        </span>
      </div>

      <van-swipe class="gift-swipe" :show-indicators="pages.length > 1" indicator-color="#eb6300">
        <van-swipe-item v-for="(page, pi) in pages" :key="pi">
          <div class="gift-page">
            <button
              v-for="gift in page"
              :key="gift.id"
              class="gift-item"
              :class="{ 'is-active': selected?.id === gift.id }"
              @click="selected = gift"
            >
              <span class="face">{{ gift.icon }}</span>
              <span class="name">{{ gift.name }}</span>
              <span class="price">
                <img src="/assets/eve/chatRoom/coin_16@2x.png" alt="" />{{ gift.price }}
              </span>
            </button>
          </div>
        </van-swipe-item>
      </van-swipe>

      <div class="panel-foot">
        <button class="recharge" @click="goRecharge">
          <img src="/assets/eve/chatRoom/coin_16@2x.png" alt="" />
          {{ coins }}
          <van-icon name="arrow" />
        </button>
        <div class="foot-right">
          <button class="qty" @click="cycleQty">×{{ count }}</button>
          <button class="send" :disabled="!selected" @click="onSend">Send</button>
        </div>
      </div>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { showToast } from "vant";
import { api } from "../services/api";
import { useUserStore } from "../stores";
import { useGiftAnimation } from "../composables/useGiftAnimation";
import type { Anchor, Gift } from "../types/eve";

const props = defineProps<{ show: boolean; anchor: Anchor | null }>();
const emit = defineEmits<{
  "update:show": [boolean];
  sent: [{ gift: Gift; count: number }];
}>();

const router = useRouter();
const userStore = useUserStore();
const anim = useGiftAnimation();

const gifts = ref<Gift[]>([]);
const selected = ref<Gift | null>(null);
const count = ref(1);
const qtyOptions = [1, 9, 30, 99];

const coins = computed(() => userStore.coins);
const pages = computed(() => {
  const out: Gift[][] = [];
  for (let i = 0; i < gifts.value.length; i += 8) out.push(gifts.value.slice(i, i + 8));
  return out;
});

onMounted(async () => {
  gifts.value = await api.getGifts();
});

// 每次打开重置选择
watch(
  () => props.show,
  (v) => {
    if (v) {
      selected.value = null;
      count.value = 1;
    }
  }
);

function cycleQty() {
  const i = qtyOptions.indexOf(count.value);
  count.value = qtyOptions[(i + 1) % qtyOptions.length];
}

function goRecharge() {
  emit("update:show", false);
  router.push("/recharge");
}

function onSend() {
  if (!selected.value || !props.anchor) return;
  const gift = selected.value;
  const total = gift.price * count.value;
  if (coins.value < total) {
    showToast("Not enough coins");
    goRecharge();
    return;
  }
  // 金币走 store（Pinia 响应式自动刷新各处余额）；gift:received 仅用于"他人送礼"推送，
  // 自己送的礼物只在本地播放一次动画，避免重复播放/误标"Received"
  userStore.addCoins(-total);
  anim.play(gift, count.value, true);
  emit("sent", { gift, count: count.value });
  emit("update:show", false);
}
</script>

<style scoped lang="scss">
.gift-panel {
  height: 58vh;
  padding: 16px 16px 0;
  background: linear-gradient(135deg, #3a2526 0%, #2c1a1a 100%);
  display: flex;
  flex-direction: column;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;

  .title {
    font-size: 16px;
    font-weight: 700;
    color: #fff;
  }
  .balance {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 14px;
    color: #ffd36e;
    img {
      width: 16px;
      height: 16px;
    }
  }
}

.gift-swipe {
  flex: 1;
}

.gift-page {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: min-content;
  gap: 8px;
  padding-bottom: 24px;
}

.gift-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.18);
  border: 1.5px solid transparent;

  &.is-active {
    border-color: #ff5473;
    background: rgba(255, 84, 115, 0.08);
    box-shadow: 0 0 8px rgba(255, 84, 115, 0.5);
  }

  .face {
    font-size: 36px;
    line-height: 1;
  }
  .name {
    font-size: 12px;
    color: #fff;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .price {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 12px;
    color: #ffd36e;
    img {
      width: 12px;
      height: 12px;
    }
  }
}

.panel-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0 calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid #241213;
}

.recharge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #fff;
  img {
    width: 16px;
    height: 16px;
  }
  :deep(.van-icon) {
    color: #9a8b8b;
  }
}

.foot-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.qty {
  padding: 7px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 13px;
}

.send {
  height: 36px;
  padding: 0 22px;
  border-radius: 18px;
  background: linear-gradient(90deg, #ff5473 0%, #eb6300 100%);
  color: #fff;
  font-size: 15px;
  font-weight: 600;

  &:disabled {
    opacity: 0.45;
  }
}
</style>
