import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
    include: ["packages/**/*.test.ts", "apps/**/*.test.{ts,tsx}"],
    passWithNoTests: false,
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 30_000,
  },
});
