import { defineConfig, devices } from "@playwright/test";

const managesWebServer =
  process.env.CAPACITY_GOVERNOR_E2E_EXTERNAL_SERVER !== "1";

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
    baseURL: "http://localhost:3100",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: managesWebServer
    ? {
        command: "node node_modules/next/dist/bin/next dev --port 3100",
        cwd: "apps/web",
        env: {
          ...process.env,
          DATABASE_URL: "pglite://e2e",
        },
        reuseExistingServer: false,
        timeout: 120_000,
        url: "http://localhost:3100",
      }
    : undefined,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
