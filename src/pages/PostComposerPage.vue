<template>
  <section class="composer">
    <TopBar :title="t('composer.title')">
      <button class="post-link" :class="{ on: canPost }" @click="publish">{{ t("composer.post") }}</button>
    </TopBar>

    <div class="text-card">
      <label><i>*</i> {{ t("composer.shareSomething") }}</label>
      <div class="panel">
        <textarea v-model="text" maxlength="200" :placeholder="t('composer.placeholder')" />
        <span class="counter">{{ text.length }}/200</span>
      </div>
    </div>

    <div class="photos">
      <span class="label">{{ t("composer.addPhotos") }}</span>
      <div class="grid">
        <div v-for="(img, i) in images" :key="img" class="tile">
          <img :src="img" alt="" />
          <button class="del" @click="removeImage(i)">×</button>
        </div>
        <button v-if="images.length < 9" class="add" @click="fileInput?.click()">＋</button>
      </div>
    </div>

    <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="onFiles" />

    <button class="post-btn" :disabled="!canPost" @click="publish">{{ t("composer.post") }}</button>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { showToast } from "vant";
import TopBar from "../components/TopBar.vue";
import { useUserStore, useMomentsStore } from "../stores";
import { fileToDataUrl } from "../utils/image";
import { uploadFile } from "../services/upload";
import { publishMoment } from "../services/moment";
import { ApiError } from "../services/http";
import type { Anchor, Moment } from "../types/eve";

const { t } = useI18n();
const router = useRouter();
const userStore = useUserStore();
const momentsStore = useMomentsStore();

const text = ref("");
const images = ref<string[]>([]); // data URL 预览
const files = ref<File[]>([]); // 与 images 同序,发布时上传 COS
const fileInput = ref<HTMLInputElement | null>(null);
const publishing = ref(false);

const canPost = computed(() => text.value.trim().length > 0 && !publishing.value);

async function onFiles(e: Event) {
  const input = e.target as HTMLInputElement;
  const picked = input.files;
  if (!picked) return;
  let failed = false;
  try {
    for (const f of Array.from(picked)) {
      if (images.value.length >= 9) break;
      try {
        // 预览用 data URL;原始 File 留作发布时上传 COS
        images.value.push(await fileToDataUrl(f));
        files.value.push(f);
      } catch {
        failed = true; // 跳过无法解码的文件,继续处理其余
      }
    }
  } finally {
    input.value = ""; // 始终重置,保证重选同一文件能再次触发
  }
  if (failed) showToast(t("composer.someImagesFailed"));
}

function removeImage(i: number) {
  images.value.splice(i, 1);
  files.value.splice(i, 1);
}

async function publish() {
  if (publishing.value) return;
  if (!text.value.trim()) {
    showToast(t("composer.pleaseWrite"));
    return;
  }
  publishing.value = true;
  try {
    // 图片先上传到 COS,拿到公开地址作为 mediaUrls
    const mediaUrls: string[] = [];
    for (const f of files.value) mediaUrls.push(await uploadFile(f, "moment"));
    const id = await publishMoment(text.value.trim(), mediaUrls);
    // 即时插入推荐流顶部(真实图片地址 + 当前用户),刷新后由真实流接管
    const u = userStore.user;
    const author: Anchor = {
      id: u.id || 0,
      nickname: u.nickname || "Me",
      age: u.age || 0,
      region: u.region || "",
      avatar: u.avatar || "",
      online: true,
      onDuty: false,
      intro: "",
      followers: 0,
      price: 0,
      tags: []
    };
    const moment: Moment = {
      id: id || Date.now(),
      user: author,
      content: text.value.trim(),
      images: mediaUrls,
      likes: 0,
      liked: false
    };
    momentsStore.prepend(moment);
    showToast(t("composer.posted"));
    router.back();
  } catch (e) {
    // 后端可读消息(含空格)直接展示;否则(原始 i18n key 如 dongtai_jiayuan_cishu)显示通用文案
    const msg = e instanceof ApiError ? e.message : "";
    showToast(msg && /\s/.test(msg) ? msg : t("composer.failed"));
  } finally {
    publishing.value = false;
  }
}
</script>

<style scoped lang="scss">
.composer {
  min-height: 100vh;
  padding-bottom: 96px;
  background: var(--eve-bg);
}
.post-link {
  font-size: 15px;
  font-weight: 600;
  color: var(--eve-faint);
  &.on {
    color: var(--eve-pink);
  }
}
.text-card {
  padding: 12px 16px 0;
  label {
    font-size: 16px;
    font-weight: 600;
    color: #fff;
    i {
      color: var(--eve-pink);
      font-style: normal;
      margin-right: 2px;
    }
  }
}
.panel {
  position: relative;
  margin-top: 12px;
  padding: 14px;
  border-radius: 12px;
  background: var(--eve-surface);
  textarea {
    width: 100%;
    min-height: 140px;
    background: none;
    border: none;
    outline: none;
    resize: none;
    color: #fff;
    font-size: 15px;
    line-height: 1.5;
    &::placeholder {
      color: var(--eve-faint);
    }
  }
  .counter {
    position: absolute;
    right: 14px;
    bottom: 10px;
    font-size: 12px;
    color: var(--eve-faint);
  }
}
.photos {
  padding: 16px;
  .label {
    display: block;
    margin-bottom: 10px;
    font-size: 16px;
    font-weight: 600;
    color: #fff;
  }
  .grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .tile {
    position: relative;
    width: 88px;
    height: 88px;
    border-radius: 10px;
    overflow: hidden;
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .del {
      position: absolute;
      top: 3px;
      right: 3px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.6);
      color: #fff;
      font-size: 16px;
      line-height: 1;
    }
  }
  .add {
    width: 88px;
    height: 88px;
    border-radius: 10px;
    border: 1px dashed #5a4546;
    color: var(--eve-faint);
    font-size: 30px;
    display: grid;
    place-items: center;
  }
}
.post-btn {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;
  width: min(400PX, 100vw);
  padding: 14px 16px calc(14px + env(safe-area-inset-bottom));
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  background: var(--eve-grad);
  &:disabled {
    opacity: 0.5;
  }
}
</style>
