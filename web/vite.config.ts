import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(root, "./src"),
      "fast-antx-js": path.resolve(root, "../packages/fast-antx-js/src/index.ts"),
    },
  },
  server: {
    fs: {
      allow: [path.resolve(root, "..")],
    },
  },
});
