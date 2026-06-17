<template>
  <section class="page form-page">
    <TopBar :title="title" />

    <form v-if="formType === 'profile'" class="form-card" @submit.prevent>
      <img class="form-avatar" :src="user.avatar" alt="" />
      <label>Nickname<input :value="user.nickname" /></label>
      <label>Age<input :value="user.age" /></label>
      <label>Bio<textarea value="Open minded, sweet voice, love music and night talks." /></label>
      <button class="primary-action">Save</button>
    </form>

    <form v-else-if="formType === 'feedback'" class="form-card" @submit.prevent>
      <label>Type<select><option>Bug</option><option>Suggestion</option><option>Payment</option></select></label>
      <label>Content<textarea placeholder="Tell us what happened..." /></label>
      <button class="primary-action">Submit</button>
    </form>

    <form v-else class="form-card" @submit.prevent>
      <label>Moment<textarea placeholder="Share something..." /></label>
      <div class="upload-box">＋ Album / Video</div>
      <button class="primary-action">Publish</button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import TopBar from "../components/TopBar.vue";
import { eveMockApi } from "../services/eveMockApi";

const route = useRoute();
const title = computed(() => String(route.meta.title || "Form"));
const formType = computed(() => String(route.meta.formType || "profile")).value;
const user = eveMockApi.getCurrentUser();
</script>
