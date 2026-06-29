<template>
  <section class="page">
    <TopBar :title="t('editProfile.title')">
      <button class="save" :disabled="saving || uploading" @click="save">{{ saving ? t("editProfile.saving") : t("common.save") }}</button>
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

    <!-- 相册 -->
    <div class="bio-block">
      <span class="label">{{ t("editProfile.photos") }}</span>
      <van-uploader
        v-model="photos"
        multiple
        :max-count="6"
        accept="image/*"
        class="uploader"
        :after-read="onAlbumAdd"
        :before-delete="onAlbumDelete"
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
import { onMounted, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { showToast } from "vant";
import type { UploaderFileListItem } from "vant";
import TopBar from "../components/TopBar.vue";
import { useUserStore } from "../stores";
import { updateProfile, type ProfileUpdate } from "../services/auth";
import { uploadFile } from "../services/upload";
import { getAlbumList, addAlbumPhoto, deleteAlbumPhoto } from "../services/album";
import { ApiError } from "../services/http";
import { countryFlag } from "../utils/assets";

const { t } = useI18n();
const router = useRouter();
const userStore = useUserStore();
const u = userStore.user;
const saving = ref(false);

// 后端性别用编码（1=Male，2=Female），UI 用标签，两者互转
function genderLabel(code?: string): string {
  return code === "1" ? "Male" : "Female";
}
function genderCode(label: string): number {
  return label === "Male" ? 1 : 2;
}
// eve 表单用 age，后端要 birthdate（近似为该出生年 1 月 1 日）
function birthdateFromAge(age: number): string {
  return new Date(Date.UTC(new Date().getUTCFullYear() - age, 0, 1)).toISOString();
}

const form = reactive({
  avatar: u.avatar || "",
  nickname: u.nickname || "",
  bio: u.intro || "",
  gender: genderLabel(u.gender),
  age: u.age || 24,
  region: u.region || "ind"
});

const uploading = ref(false);
// 相册:逐项 CRUD(加图即上传+审核、删图即删)。行携带后端 album id 以便删除。
type Photo = UploaderFileListItem & { id?: number };
const photos = ref<Photo[]>([]);

onMounted(async () => {
  if (!u.id) return;
  try {
    const list = await getAlbumList();
    photos.value = list.map((a) => ({ url: a.url, id: a.id }));
  } catch {
    /* 相册载入失败:留空 */
  }
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
  uploading.value = true;
  try {
    form.avatar = await uploadFile(f.file, "user"); // 选图即上传，form.avatar 变为可访问 URL
  } catch {
    showToast(t("editProfile.imageError"));
  } finally {
    uploading.value = false;
  }
}

// 新增相册照片:上传 → /album/add(含内容审核)。成功写回真实 URL+id;失败提示并移除该项。
async function onAlbumAdd(file: Photo | Photo[]) {
  const items = Array.isArray(file) ? file : [file];
  for (const f of items) {
    if (!f.file) continue;
    f.status = "uploading";
    f.message = t("editProfile.uploading");
    try {
      const url = await uploadFile(f.file, "user");
      const photo = await addAlbumPhoto(url);
      f.url = photo.url || url;
      f.id = photo.id;
      f.status = "done";
      f.message = "";
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : t("editProfile.imageError"));
      photos.value = photos.value.filter((p) => p !== f);
    }
  }
}

// 删除相册照片:已入库的调 /album/{id} 删除,删除失败则不从 UI 移除。
async function onAlbumDelete(item: Photo): Promise<boolean> {
  if (item.id) {
    try {
      await deleteAlbumPhoto(item.id);
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : t("followFans.actionFailed"));
      return false;
    }
  }
  return true;
}

async function save() {
  if (saving.value) return;
  saving.value = true;
  try {
    const req: ProfileUpdate = {
      nickname: form.nickname.trim(),
      gender: genderCode(form.gender),
      aboutMe: form.bio,
      birthdate: birthdateFromAge(form.age)
    };
    // 仅当头像是已上传的 URL 时才回传；新选的本地图片需走文件上传接口（暂未接入）
    if (/^https?:\/\//i.test(form.avatar)) req.icon = form.avatar;
    await updateProfile(req);
    userStore.setUser({
      nickname: req.nickname,
      gender: String(req.gender),
      intro: form.bio,
      age: form.age,
      region: form.region, // 后端 update 不含地区，仅本地反映，刷新后以服务端为准
      ...(req.icon ? { avatar: req.icon } : {})
    });
    showToast(t("editProfile.saved"));
    router.back();
  } catch (e) {
    showToast(e instanceof ApiError ? e.message : t("editProfile.saveFailed"));
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: var(--eve-bg);
}
.save {
  padding: 6px 16px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: var(--eve-grad);
}
.uploader {
  margin-top: 4px;
  :deep(.van-uploader__upload) {
    background: var(--eve-surface);
    border: 1px solid var(--eve-line);
    border-radius: 12px;
  }
  :deep(.van-uploader__upload-icon) {
    color: var(--eve-faint);
  }
  :deep(.van-uploader__preview-image) {
    border-radius: 12px;
  }
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 14px 16px;
  border-bottom: 1px solid var(--eve-line);
  .label {
    font-size: 15px;
    color: #fff;
  }
  .value {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    color: var(--eve-faint);
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
    color: var(--eve-faint);
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
  border-bottom: 1px solid var(--eve-line);
  .label {
    display: block;
    margin-bottom: 8px;
    font-size: 15px;
    color: #fff;
  }
  :deep(.van-field) {
    background: var(--eve-surface);
    border-radius: 12px;
  }
  :deep(.van-field__control) {
    color: #fff;
  }
  :deep(.van-field__control::placeholder) {
    color: var(--eve-faint);
  }
  :deep(.van-field__word-limit) {
    color: var(--eve-faint);
  }
}
</style>
