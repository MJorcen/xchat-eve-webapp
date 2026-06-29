import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBase = env.VITE_API_BASE || "/api/v1";
  const proxyTarget = env.VITE_API_PROXY_TARGET || "https://api-local.dbencong.com";
  // 取前缀首段（/api/v1 -> /api）作为代理匹配前缀，覆盖该前缀下所有请求。
  const proxyPrefix = "/" + apiBase.replace(/^\//, "").split("/")[0];

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url))
      }
    },
    server: {
      host: "0.0.0.0",
      port: 5178,
      proxy: {
        [proxyPrefix]: {
          target: proxyTarget,
          changeOrigin: true,
          secure: false
        }
      }
    }
  };
});
