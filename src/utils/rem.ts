// 移动端 rem 适配：设计稿宽 375，根字号 = clientWidth / 10（375 时为 37.5px）。
// 桌面预览时把宽度锁到 MAX_WIDTH，配合 #app 居中，呈现一个手机宽度的画面。
const DESIGN_WIDTH = 375;
const MAX_WIDTH = 600;

function setRem() {
  const clientWidth = document.documentElement.clientWidth || window.innerWidth;
  const width = Math.min(clientWidth, MAX_WIDTH);
  const fontSize = (width / DESIGN_WIDTH) * 37.5;
  document.documentElement.style.fontSize = `${fontSize}px`;
}

setRem();
window.addEventListener("resize", setRem);
window.addEventListener("pageshow", (e) => {
  if (e.persisted) setRem();
});

export {};
