import { spawn, spawnSync } from "node:child_process";
import path from "node:path";

const repositoryRoot = process.cwd();
const webRoot = path.join(repositoryRoot, "apps", "web");
const nextCli = path.join(
  webRoot,
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
);
const playwrightCli = path.join(
  repositoryRoot,
  "node_modules",
  "@playwright",
  "test",
  "cli.js",
);
const environment = {
  ...process.env,
  CAPACITY_GOVERNOR_E2E_EXTERNAL_SERVER: "1",
  DATABASE_URL: "pglite://e2e",
};

const server = spawn(process.execPath, [nextCli, "dev", "--port", "3100"], {
  cwd: webRoot,
  detached: process.platform !== "win32",
  env: environment,
  stdio: "ignore",
});
server.unref();

const stopServer = () => {
  if (!server.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    // The server may already have exited.
  }
};

const waitForServer = async () => {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(
        `Next.js exited before becoming ready (${server.exitCode})`,
      );
    }
    try {
      const response = await fetch("http://localhost:3100");
      if (response.ok) return;
    } catch {
      // Startup connection failures are expected until Next.js is listening.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Next.js did not become ready within 120 seconds");
};

try {
  await waitForServer();
  const tests = spawn(process.execPath, [playwrightCli, "test"], {
    cwd: repositoryRoot,
    env: environment,
    stdio: "inherit",
  });
  const exitCode = await new Promise((resolve) => tests.once("exit", resolve));
  process.exitCode = typeof exitCode === "number" ? exitCode : 1;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  stopServer();
}
