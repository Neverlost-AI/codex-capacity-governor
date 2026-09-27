import { defineConfig, devices } from "@playwright/test";

if (process.env.CAPACITY_GOVERNOR_E2E_EXTERNAL_SERVER !== "1")
  throw new Error(
    "Use pnpm test:e2e: its supported local launcher captures runtime pairing in memory.",
  );

export default defineConfig({
  testDir: "./apps/web/e2e",
  fullyParallel: false,
  expect: {
    timeout: 30_000,
  },
  retries: 0,
  reporter: "list",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:3100",
    screenshot: "only-on-failure",
    trace: "off", // Pairing/cookie/CSRF/challenge secrets must not enter trace artifacts.
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
