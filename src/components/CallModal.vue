<template>
  <div v-if="callState.target" class="modal" @click.self="closeCall">
    <div class="call-card">
      <img :src="callState.target.avatar" alt="" />
      <h2>{{ callState.target.nickname }}</h2>
      <p>Video call · {{ callState.target.price }}/min</p>
      <div>
        <button class="hang" @click="closeCall">✕</button>
        <button class="answer" @click="answerCall">☎</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCall } from "../composables/useCall";
import { useRouter } from "vue-router";

const { callState, closeCall } = useCall();
const router = useRouter();

function answerCall() {
  const id = callState.target?.id;
  closeCall();
  if (id) {
    router.push(`/call/${id}`);
  }
}
</script>
