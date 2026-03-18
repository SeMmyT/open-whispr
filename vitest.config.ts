import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    root: ".",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@core": path.resolve(__dirname, "src/core"),
      "@cli": path.resolve(__dirname, "src/cli"),
      "@shared": path.resolve(__dirname, "src/shared"),
    },
  },
});
