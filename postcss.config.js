export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    // 移动端适配：375 设计稿，配合 src/utils/rem.ts 将根字号设为 clientWidth/10
    "postcss-pxtorem": {
      rootValue: 37.5,
      propList: ["*"],
      // 不转换 1px 边框，保持细线
      minPixelValue: 2
    }
  }
};
