<template>
  <section class="complete-reg">
    <header class="head">
      <h1>Complete your profile</h1>
      <p>Tell us a bit about you to finish signing up</p>
    </header>

    <div class="form">
      <label class="field">
        <span class="label">Nickname</span>
        <input v-model.trim="nickname" maxlength="24" placeholder="Your nickname" />
      </label>

      <div class="field">
        <span class="label">Gender</span>
        <div class="genders">
          <button :class="['g', { on: gender === 1 }]" @click="gender = 1">♂ Male</button>
          <button :class="['g', { on: gender === 2 }]" @click="gender = 2">♀ Female</button>
        </div>
      </div>

      <label class="field">
        <span class="label">Birthday</span>
        <input v-model="birthdate" type="date" :max="maxBirthdate" />
      </label>
    </div>

    <button class="submit" :disabled="!canSubmit || loading" @click="submit">
      {{ loading ? "Submitting…" : "Start Eve" }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { showToast } from "vant";
import { completeRegistration, toCurrentUser } from "../services/auth";
import { ApiError } from "../services/http";
import { useUserStore } from "../stores";

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const nickname = ref("");
const gender = ref<1 | 2>(1);
// 默认 24 岁生日;上限 18 岁(成人产品)
const birthdate = ref(isoDaysAgoYears(24));
const loading = ref(false);

const maxBirthdate = isoDaysAgoYears(18);
const canSubmit = computed(() => nickname.value.length >= 2 && !!birthdate.value);

function isoDaysAgoYears(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

// 完成注册:后端置 NORMAL + 云信建号 + 发 token(与三方登录同一尾段)→ 建立登录态回跳。
async function submit() {
  if (!canSubmit.value || loading.value) return;
  const userId = Number(sessionStorage.getItem("eve_pending_reg_user") || 0);
  if (!userId) {
    showToast("Session expired, please sign in again");
    router.replace("/login");
    return;
  }
  loading.value = true;
  try {
    const vo = await completeRegistration({
      userId,
      nickname: nickname.value,
      gender: gender.value,
      birthdate: new Date(birthdate.value + "T00:00:00Z").toISOString()
    });
    if (!vo.authToken) throw new ApiError(-1, "Sign up failed");
    sessionStorage.removeItem("eve_pending_reg_user");
    const token = vo.authToken.replace(/^Bearer\s+/i, "");
    userStore.setAuth(token, toCurrentUser(vo.user), vo.neteaskAuthToken);
    const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/";
    router.replace(redirect);
  } catch (e) {
    showToast(e instanceof ApiError ? e.message : "Sign up failed");
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped lang="scss">
.complete-reg {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 48px 24px calc(28px + env(safe-area-inset-bottom));
  background: var(--eve-bg);
}

.head {
  margin-bottom: 28px;
  h1 {
    font-size: 24px;
    font-weight: 700;
    color: #fff;
  }
  p {
    margin-top: 6px;
    font-size: 14px;
    color: var(--eve-faint);
  }
}

.form {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .label {
    font-size: 13px;
    color: var(--eve-muted);
  }

  input {
    height: 48px;
    padding: 0 16px;
    border-radius: 14px;
    background: var(--eve-surface);
    border: 1px solid var(--eve-line);
    color: #fff;
    font-size: 15px;
    color-scheme: dark;

    &:focus {
      border-color: var(--eve-pink);
    }
  }
}

.genders {
  display: flex;
  gap: 12px;

  .g {
    flex: 1;
    height: 48px;
    border-radius: 14px;
    background: var(--eve-surface);
    border: 1px solid var(--eve-line);
    color: var(--eve-muted);
    font-size: 15px;
    font-weight: 600;

    &.on {
      color: #fff;
      border-color: var(--eve-pink);
      background: linear-gradient(120deg, rgba(255, 42, 122, 0.25), rgba(153, 69, 255, 0.25));
    }
  }
}

.submit {
  height: 50px;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  background: var(--eve-grad);
  box-shadow: 0 8px 24px rgba(235, 99, 0, 0.4);

  &:disabled {
    opacity: 0.5;
  }
}
</style>
