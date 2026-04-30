import { defineConfig } from "vite";
import tailwindAutoReference from "vite-plugin-vue-tailwind-auto-reference";

import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { readFileSync } from "fs";
import { fileURLToPath, URL } from "url";

const rootPkg = JSON.parse(readFileSync(fileURLToPath(new URL("../../package.json", import.meta.url)), "utf-8"));

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3010,
  },
  build: {
    target: "esnext",
    sourcemap: "hidden",
    rollupOptions: {},
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
  },
  plugins: [vue(), tailwindAutoReference("./src/assets/tailwind.css"), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      tests: fileURLToPath(new URL("./tests", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    env: {
      TZ: "UTC-3",
    },
    setupFiles: ["./tests/setup.ts"],
    include: ["./tests/**/**.spec.ts"],
    coverage: {
      reporter: ["text", "json", "html"],
    },
  },
  define: {
    __VUE_I18N_FULL_INSTALL__: true,
    __VUE_I18N_LEGACY_API__: false,
    __INTLIFY_PROD_DEVTOOLS__: false,
    "import.meta.env.VITE_VERSION": JSON.stringify(
      process.env.VITE_VERSION || process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || rootPkg.version
    ),
  },
});
