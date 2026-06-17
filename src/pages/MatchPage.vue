<template>
  <section class="page match-page with-tab">
    <h1>Match</h1>
    <img class="match-hero" src="/assets/eve/matchHome/Group 1000004710@2x.png" alt="" />
    <div class="match-actions">
      <button class="pill pink" @click="startMatch('Random')">
        <span>Random</span>
        <small>300 <img src="/assets/eve/matchHome/coin_20@2x.png" alt="" /> /match</small>
      </button>
      <button class="pill coral" @click="startMatch('Goddess')">
        <span>Goddess</span>
        <small>500 <img src="/assets/eve/matchHome/coin_20@2x.png" alt="" /> /match</small>
      </button>
    </div>
    <div v-if="matching" class="matching-panel">
      <strong>{{ matchType }} matching...</strong>
      <span>Searching for an online host</span>
    </div>
    <button v-if="matching" class="stop-match" @click="matching = false">Stop match</button>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";

const matching = ref(false);
const matchType = ref("Random");

function startMatch(type: string) {
  matchType.value = type;
  matching.value = true;
}
</script>
