<template>
  <article class="moment-card">
    <header class="head">
      <van-image round fit="cover" class="avatar" :src="moment.user.avatar" lazy-load
        @click="router.push(`/anchor/${moment.user.id}`)" />
      <div class="who">
        <div class="name-row">
          <strong class="name">{{ moment.user.nickname }}</strong>
          <img class="flag" :src="countryFlag(moment.user.region)" alt="" />
        </div>
        <span class="sub">{{ moment.user.online ? t("momentCard.onlineNow") : t("momentCard.activeRecently") }}</span>
      </div>
      <button class="more" @click="showActions = !showActions">
        <img src="/assets/eve/dynamic/more-horizontal@2x.png" alt="" />
      </button>
    </header>

    <p class="content">{{ translated ? "（译）" + moment.content : moment.content }}</p>
    <button class="translate" @click="translated = !translated">
      <img src="/assets/eve/dynamic/icon_translate@2x.png" alt="" />
      {{ translated ? t("momentCard.hideTranslation") : t("momentCard.seeTranslation") }}
    </button>

    <div class="images" :class="`count-${moment.images.length}`">
      <van-image v-for="image in moment.images" :key="image" fit="cover" class="img" :src="image" lazy-load />
    </div>

    <footer class="actions">
      <button class="action" @click="liked = !liked">
        <img :src="liked ? '/assets/eve/dynamic/likeTrue.png' : '/assets/eve/dynamic/like.png'" alt="" />
        {{ likeCount }}
      </button>
      <button class="action" @click="router.push(`/chat/${moment.user.id}`)">
        <img src="/assets/eve/dynamic/chat.png" alt="" /> {{ t("momentCard.chat") }}
      </button>
      <button class="action" @click="openCall(moment.user)">
        <img src="/assets/eve/dynamic/video.png" alt="" /> {{ t("momentCard.call") }}
      </button>
    </footer>

    <div v-if="showActions" class="inline-actions">
      <button @click="router.push('/block-list')">{{ t("momentCard.block") }}</button>
      <button @click="router.push('/feedback')">{{ t("momentCard.report") }}</button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useCall } from "../composables/useCall";
import type { Moment } from "../types/eve";
import { countryFlag } from "../utils/assets";

const props = defineProps<{ moment: Moment }>();
const { t } = useI18n();
const router = useRouter();
const { openCall } = useCall();

const liked = ref(props.moment.liked);
const translated = ref(false);
const showActions = ref(false);
const likeCount = computed(() => props.moment.likes + (liked.value && !props.moment.liked ? 1 : 0));
</script>

<style scoped lang="scss">
.moment-card {
  padding: 14px 16px;
  border-bottom: 8px solid #241213;
}

.head {
  display: flex;
  align-items: center;
  gap: 10px;

  .avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    overflow: hidden;
    flex: 0 0 auto;
  }
  .who {
    flex: 1;
    min-width: 0;
  }
  .name-row {
    display: flex;
    align-items: center;
    gap: 6px;
    .name {
      font-size: 15px;
      font-weight: 600;
      color: #fff;
    }
    .flag {
      width: 18px;
      height: 13px;
      border-radius: 2px;
    }
  }
  .sub {
    font-size: 11px;
    color: #9a8b8b;
  }
  .more img {
    width: 22px;
    height: 22px;
    opacity: 0.7;
  }
}

.content {
  margin: 10px 0 6px;
  font-size: 14px;
  line-height: 1.5;
  color: #ece4e4;
}

.translate {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #6ea8ff;
  margin-bottom: 10px;
  img {
    width: 14px;
    height: 14px;
  }
}

.images {
  display: grid;
  gap: 6px;

  &.count-1 {
    grid-template-columns: 60%;
  }
  &.count-2 {
    grid-template-columns: repeat(2, 1fr);
  }
  &.count-3,
  & {
    grid-template-columns: repeat(3, 1fr);
  }

  .img {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 8px;
    overflow: hidden;
  }
}

.actions {
  display: flex;
  gap: 22px;
  margin-top: 12px;

  .action {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #c8bcbc;
    img {
      width: 18px;
      height: 18px;
    }
  }
}

.inline-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  button {
    padding: 6px 16px;
    border-radius: 16px;
    background: #3a2526;
    color: #ece4e4;
    font-size: 12px;
  }
}
</style>
