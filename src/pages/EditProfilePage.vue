<template>
  <section class="page">
    <TopBar :title="t('editProfile.title')">
      <button class="save" @click="save">{{ t("common.save") }}</button>
    </TopBar>

    <!-- 头像 -->
    <div class="row avatar-row">
      <span class="label">{{ t("editProfile.avatar") }}</span>
      <van-uploader :after-read="onAvatar" :max-count="1" :preview-image="false">
        <van-image round fit="cover" class="avatar" :src="form.avatar" />
      </van-uploader>
    </div>

    <!-- 昵称 -->
    <div class="row">
      <span class="label">{{ t("editProfile.nickname") }}</span>
      <van-field v-model="form.nickname" input-align="right" :placeholder="t('editProfile.namePlaceholder')" clearable />
    </div>

    <!-- 简介 -->
    <div class="bio-block">
      <span class="label">{{ t("editProfile.bio") }}</span>
      <van-field
        v-model="form.bio"
        type="textarea"
        rows="3"
        maxlength="200"
        show-word-limit
        :placeholder="t('editProfile.bioPlaceholder')"
      />
    </div>

    <!-- 性别 -->
    <button class="row" @click="showGender = true">
      <span class="label">{{ t("editProfile.gender") }}</span>
      <span class="value">{{ form.gender }} <van-icon name="arrow" /></span>
    </button>

    <!-- 年龄 -->
    <button class="row" @click="showAge = true">
      <span class="label">{{ t("editProfile.age") }}</span>
      <span class="value">{{ form.age }} <van-icon name="arrow" /></span>
    </button>

    <!-- 地区 -->
    <button class="row" @click="showRegion = true">
      <span class="label">{{ t("editProfile.region") }}</span>
      <span class="value">
        <img class="flag" :src="countryFlag(form.region)" alt="" />
        {{ form.region.toUpperCase() }} <van-icon name="arrow" />
      </span>
    </button>

    <van-action-sheet
      v-model:show="showGender"
      :actions="genderActions"
      :cancel-text="t('common.cancel')"
      close-on-click-action
      @select="(a: any) => (form.gender = a.name)"
    />
    <van-action-sheet
      v-model:show="showAge"
      :actions="ageActions"
      :cancel-text="t('common.cancel')"
      close-on-click-action
      @select="(a: any) => (form.age = Number(a.name))"
    />
    <van-action-sheet
      v-model:show="showRegion"
      :actions="regionActions"
      :cancel-text="t('common.cancel')"
      close-on-click-action
      @select="(a: any) => (form.region = a.name)"
    />
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { showLoadingToast, closeToast, showToast } from "vant";
import type { UploaderFileListItem } from "vant";
import TopBar from "../components/TopBar.vue";
import { useUserStore } from "../stores";
import { countryFlag } from "../utils/assets";
import { fileToDataUrl } from "../utils/image";

const { t } = useI18n();
const router = useRouter();
const userStore = useUserStore();
const u = userStore.user;

const form = reactive({
  avatar: u.avatar || "",
  nickname: u.nickname || "",
  bio: u.intro || "Open minded, love music and night talks.",
  gender: u.gender || "Female",
  age: u.age || 24,
  region: u.region || "ind"
});

const showGender = ref(false);
const showAge = ref(false);
const showRegion = ref(false);

const genderActions = [{ name: "Female" }, { name: "Male" }];
const ageActions = Array.from({ length: 30 }, (_, i) => ({ name: String(18 + i) }));
const regionCodes = ["usa", "bra", "ind", "phl", "vnm", "idn", "egy", "nga", "pak", "col", "fra", "esp", "mar", "bgd", "ven"];
const regionActions = regionCodes.map((c) => ({ name: c }));

async function onAvatar(file: UploaderFileListItem | UploaderFileListItem[]) {
  const f = Array.isArray(file) ? file[0] : file;
  if (!f.file) return;
  try {
    form.avatar = await fileToDataUrl(f.file, 256);
  } catch {
    showToast(t("editProfile.imageError"));
  }
}

function save() {
  showLoadingToast({ message: t("editProfile.saving"), forbidClick: true });
  window.setTimeout(() => {
    userStore.setUser({
      nickname: form.nickname,
      age: form.age,
      region: form.region,
      avatar: form.avatar,
      intro: form.bio,
      gender: form.gender
    });
    closeToast();
    showToast(t("editProfile.saved"));
    router.back();
  }, 600);
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #2c1a1a;
}
.save {
  padding: 6px 16px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(90deg, #ff5473, #eb6300);
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 14px 16px;
  border-bottom: 1px solid #241213;
  .label {
    font-size: 15px;
    color: #fff;
  }
  .value {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    color: #9a8b8b;
  }
  .flag {
    width: 20px;
    height: 14px;
    border-radius: 3px;
    object-fit: cover;
  }
  :deep(.van-field) {
    flex: 1;
    background: transparent;
    padding: 0;
  }
  :deep(.van-field__control) {
    color: #fff;
  }
  :deep(.van-field__control::placeholder) {
    color: #9a8b8b;
  }
}
.avatar-row .avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
}
.bio-block {
  padding: 14px 16px;
  border-bottom: 1px solid #241213;
  .label {
    display: block;
    margin-bottom: 8px;
    font-size: 15px;
    color: #fff;
  }
  :deep(.van-field) {
    background: #3a2526;
    border-radius: 12px;
  }
  :deep(.van-field__control) {
    color: #fff;
  }
  :deep(.van-field__control::placeholder) {
    color: #9a8b8b;
  }
  :deep(.van-field__word-limit) {
    color: #9a8b8b;
  }
}
</style>
