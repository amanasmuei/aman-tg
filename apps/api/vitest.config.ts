import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Only run source tests — exclude compiled duplicates in dist/.
    // Without this, every test runs twice (once from src/, once from dist/).
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules/**", "dist/**"],
  },
});
