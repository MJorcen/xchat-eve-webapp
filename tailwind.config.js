/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,ts,js,tsx,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#ff4d67",
        "brand-dark": "#29191a",
        "eve-bg": "#0b0712",
        "eve-surface": "#181226",
        "eve-line": "#2a1f3d",
        "eve-pink": "#ff2a7a",
        "eve-purple": "#9945ff",
        "eve-gold": "#ffb800"
      }
    }
  },
  // Vant 自带重置，关闭 preflight 避免与 Vant/既有样式冲突
  corePlugins: {
    preflight: false
  },
  plugins: []
};
