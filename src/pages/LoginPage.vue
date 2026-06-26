<template>
  <section class="login">
    <div class="hero">
      <div class="glow" />
      <img class="logo" src="/assets/eve/logo.png" alt="" />
      <h1 class="wordmark">Eve</h1>
      <p class="tagline">Meet someone new tonight.</p>
    </div>

    <div class="actions">
      <button class="guest" :disabled="loading" @click="loginAsGuest">Continue as guest</button>

      <div class="or"><i /><span>or continue with</span><i /></div>

      <div class="oauth">
        <button @click="comingSoon">Google</button>
        <button @click="comingSoon">Apple</button>
      </div>

      <p class="terms">
        By continuing you agree to our
        <a @click="comingSoon">Terms of Service</a> and
        <a @click="comingSoon">Privacy Policy</a>.
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { showLoadingToast, closeToast, showToast } from "vant";
import { api } from "../services/api";
import { useUserStore } from "../stores";

const router = useRouter();
const userStore = useUserStore();
const loading = ref(false);
let loginTimer: number | null = null;

function loginAsGuest() {
  if (loading.value) return;
  loading.value = true;
  showLoadingToast({ message: "Signing you in…", forbidClick: true, duration: 0 });
  loginTimer = window.setTimeout(async () => {
    loginTimer = null;
    const user = await api.getCurrentUser();
    userStore.setUser(user);
    userStore.setToken(`guest-${Date.now()}`);
    closeToast();
    loading.value = false;
    router.replace("/");
  }, 800);
}

onUnmounted(() => {
  if (loginTimer) {
    window.clearTimeout(loginTimer);
    closeToast();
  }
});

function comingSoon() {
  showToast("Coming soon");
}
</script>

<style scoped lang="scss">
.login {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding: 0 24px calc(28px + env(safe-area-inset-bottom));
  background: #2c1a1a;
}

.hero {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.glow {
  position: absolute;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 84, 115, 0.22), transparent 70%);
  filter: blur(24px);
}

.logo {
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: 24px;
  box-shadow: 0 12px 40px rgba(235, 99, 0, 0.35);
}

.wordmark {
  margin-top: 20px;
  font-size: 28px;
  font-weight: 700;
  color: #fff;
}

.tagline {
  margin-top: 8px;
  font-size: 15px;
  color: #9a8b8b;
}

.actions {
  width: 100%;
}

.guest {
  width: 100%;
  height: 50px;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(90deg, #ff5473, #eb6300);
  box-shadow: 0 8px 24px rgba(235, 99, 0, 0.4);

  &:active {
    transform: scale(0.98);
  }
  &:disabled {
    opacity: 0.7;
  }
}

.or {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0;
  font-size: 13px;
  color: #9a8b8b;
  i {
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.08);
  }
}

.oauth {
  display: flex;
  gap: 12px;
  button {
    flex: 1;
    height: 48px;
    border-radius: 24px;
    background: #3a2526;
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #fff;
    font-size: 15px;
    font-weight: 500;
  }
}

.terms {
  max-width: 300px;
  margin: 20px auto 0;
  text-align: center;
  font-size: 12px;
  line-height: 1.5;
  color: #9a8b8b;
  a {
    color: #eb6300;
  }
}
</style>
