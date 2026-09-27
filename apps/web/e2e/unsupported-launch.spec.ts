import { test, expect } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
test("direct built Next launch without admitted ingress fails closed", async () => {
  test.skip(
    process.env.CAPACITY_GOVERNOR_E2E_BUILT !== "1",
    "Actual unsupported built launch is verified in the built/start run.",
  );
  const origin = "http://127.0.0.1:3111";
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    CAPACITY_GOVERNOR_ORIGIN: origin,
    CAPACITY_GOVERNOR_INGRESS_KEY: "b".repeat(64),
    NODE_OPTIONS: "",
  };
  delete environment.CAPACITY_GOVERNOR_E2E_PAIRING_SECRET;
  const server = spawn(
    process.execPath,
    [
      path.resolve("apps/web/node_modules/next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3111",
    ],
    { cwd: path.resolve("apps/web"), env: environment, stdio: "ignore" },
  );
  try {
    await expect
      .poll(
        async () => {
          try {
            return (await fetch(`${origin}/health`)).status;
          } catch {
            return 0;
          }
        },
        { timeout: 30000 },
      )
      .toBe(403);
    for (const route of ["/", "/pair", "/projects/new", "/preflight/review"]) {
      const response = await fetch(`${origin}${route}`, {
        method: route === "/preflight/review" ? "POST" : "GET",
        headers: { Origin: origin },
      });
      expect(response.status).toBe(403);
      expect(await response.text()).not.toContain("Project name");
    }
  } finally {
    if (server.pid) {
      if (process.platform === "win32") {
        const stopped = spawnSync(
          "taskkill",
          ["/PID", String(server.pid), "/T", "/F"],
          {
            stdio: "ignore",
          },
        );
        expect(
          stopped.status,
          `Owned direct-launch tree ${server.pid} cleanup`,
        ).toBe(0);
      } else server.kill("SIGTERM");
    }
  }
});
