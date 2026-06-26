<template>
  <section class="page">
    <TopBar title="Games" />
    <div class="grid">
      <button v-for="g in games" :key="g.id" class="tile" @click="play">
        <div class="cover" :style="{ background: g.bg }">{{ g.emoji }}</div>
        <div class="foot">
          <span class="name">{{ g.name }}</span>
          <span class="play">Play</span>
        </div>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { showToast } from "vant";
import TopBar from "../components/TopBar.vue";

const games = [
  { id: "greedy-cat", name: "Greedy Cat", emoji: "🐱", bg: "linear-gradient(135deg,#ff8a5c,#eb6300)" },
  { id: "lucky-wheel", name: "Lucky Wheel", emoji: "🎡", bg: "linear-gradient(135deg,#ff5473,#a8327a)" },
  { id: "dice", name: "Dice Duel", emoji: "🎲", bg: "linear-gradient(135deg,#5cc8ff,#2a6fb0)" },
  { id: "fruit", name: "Fruit Slots", emoji: "🍒", bg: "linear-gradient(135deg,#ffd36e,#eb9b00)" },
  { id: "teen-patti", name: "Teen Patti", emoji: "🃏", bg: "linear-gradient(135deg,#7ee0a6,#1c9c5a)" },
  { id: "crash", name: "Rocket Crash", emoji: "🚀", bg: "linear-gradient(135deg,#a85cff,#5a2ab0)" }
];

function play() {
  showToast("Coming soon");
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #2c1a1a;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 16px;
}
.tile {
  border-radius: 16px;
  overflow: hidden;
  background: #3a2526;
}
.cover {
  height: 110px;
  display: grid;
  place-items: center;
  font-size: 48px;
}
.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  .name {
    font-size: 14px;
    font-weight: 600;
    color: #fff;
  }
  .play {
    padding: 3px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    color: #fff;
    background: linear-gradient(90deg, #ff5473, #eb6300);
  }
}
</style>
