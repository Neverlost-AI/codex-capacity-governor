import { defineConfig, devices } from "@playwright/test";

if (process.env.CAPACITY_GOVERNOR_E2E_EXTERNAL_SERVER !== "1")
  throw new Error(
    "Use pnpm test:e2e: its supported local launcher captures runtime pairing in memory.",
  );

export default defineConfig({
  testDir: "./apps/web/e2e",
  testIgnore:
    process.env.CAPACITY_GOVERNOR_E2E_HOSTED === "1"
      ? [
          "**/unsupported-launch.spec.ts",
          "**/run-history.spec.ts",
          "**/manual-preflight.spec.ts",
          "**/governed-outcomes.spec.ts",
          "**/composed-preflight.spec.ts",
        ]
      : "**/hosted-foundation.spec.ts",
  fullyParallel: false,
  workers: 1,
  expect: {
    timeout: 30_000,
  },
  retries: 0,
  reporter: "list",
  timeout: 60_000,
  use: {
    baseURL:
      process.env.CAPACITY_GOVERNOR_E2E_HOSTED === "1"
        ? "http://127.0.0.1:3101"
        : "http://127.0.0.1:3100",
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
