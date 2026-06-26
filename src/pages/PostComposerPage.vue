<template>
  <section class="composer">
    <TopBar title="New Moment">
      <button class="post-link" :class="{ on: canPost }" @click="publish">Post</button>
    </TopBar>

    <div class="text-card">
      <label><i>*</i> Share something</label>
      <div class="panel">
        <textarea v-model="text" maxlength="200" placeholder="Say something nice…" />
        <span class="counter">{{ text.length }}/200</span>
      </div>
    </div>

    <div class="photos">
      <span class="label">Add photos</span>
      <div class="grid">
        <div v-for="(img, i) in images" :key="img" class="tile">
          <img :src="img" alt="" />
          <button class="del" @click="removeImage(i)">×</button>
        </div>
        <button v-if="images.length < 9" class="add" @click="fileInput?.click()">＋</button>
      </div>
    </div>

    <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="onFiles" />

    <button class="post-btn" :disabled="!canPost" @click="publish">Post</button>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { useRouter } from "vue-router";
import { showToast } from "vant";
import TopBar from "../components/TopBar.vue";
import { useUserStore, useMomentsStore } from "../stores";
import type { Anchor, Moment } from "../types/eve";

const router = useRouter();
const userStore = useUserStore();
const momentsStore = useMomentsStore();

const text = ref("");
const images = ref<string[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);
let published = false;

const canPost = computed(() => text.value.trim().length > 0);

function onFiles(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (!files) return;
  for (const f of Array.from(files)) {
    if (images.value.length >= 9) break;
    images.value.push(URL.createObjectURL(f));
  }
  (e.target as HTMLInputElement).value = "";
}

function removeImage(i: number) {
  URL.revokeObjectURL(images.value[i]);
  images.value.splice(i, 1);
}

function publish() {
  if (!canPost.value) {
    showToast("Please write something");
    return;
  }
  const u = userStore.user;
  const author: Anchor = {
    id: u.id || 778899,
    nickname: u.nickname || "Me",
    age: u.age || 24,
    region: u.region || "ind",
    avatar: u.avatar || "",
    online: true,
    onDuty: false,
    intro: "",
    followers: 0,
    price: 0,
    tags: []
  };
  const moment: Moment = {
    id: Date.now(),
    user: author,
    content: text.value.trim(),
    images: [...images.value],
    likes: 0,
    liked: false
  };
  momentsStore.prepend(moment);
  published = true; // 图片 URL 已交给 feed,卸载时不要回收
  showToast("Posted");
  router.back();
}

// 仅在"丢弃"路径回收;发布后这些 URL 仍被 feed 引用
onBeforeUnmount(() => {
  if (!published) images.value.forEach((u) => URL.revokeObjectURL(u));
});
</script>

<style scoped lang="scss">
.composer {
  min-height: 100vh;
  padding-bottom: 96px;
  background: #2c1a1a;
}
.post-link {
  font-size: 15px;
  font-weight: 600;
  color: #9a8b8b;
  &.on {
    color: #eb6300;
  }
}
.text-card {
  padding: 12px 16px 0;
  label {
    font-size: 16px;
    font-weight: 600;
    color: #fff;
    i {
      color: #ff5473;
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
  background: #3a2526;
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
      color: #9a8b8b;
    }
  }
  .counter {
    position: absolute;
    right: 14px;
    bottom: 10px;
    font-size: 12px;
    color: #9a8b8b;
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
    color: #9a8b8b;
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
  background: linear-gradient(90deg, #ff5473, #eb6300);
  &:disabled {
    opacity: 0.5;
  }
}
</style>
