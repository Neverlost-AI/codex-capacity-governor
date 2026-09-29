import { spawn, spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
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
const runId = randomUUID();
const environment = {
  ...process.env,
  CAPACITY_GOVERNOR_MODE: "hosted",
  CAPACITY_GOVERNOR_HOSTED_TEST_AUTH: "1",
  CAPACITY_GOVERNOR_ORIGIN: "http://127.0.0.1:3101",
  CAPACITY_GOVERNOR_FOUNDER_ISSUER: "https://accounts.google.com",
  CAPACITY_GOVERNOR_FOUNDER_SUBJECT: "local-founder-test",
  CAPACITY_GOVERNOR_SESSION_KEY: randomBytes(32).toString("hex"),
  CAPACITY_GOVERNOR_E2E_EXTERNAL_SERVER: "1",
  CAPACITY_GOVERNOR_E2E_HOSTED: "1",
  CAPACITY_GOVERNOR_HOSTED_E2E_STATE: path.join(
    repositoryRoot,
    ".data",
    `hosted-e2e-${runId}.json`,
  ),
  DATABASE_URL: `pglite://hosted-e2e-${runId}`,
};

const stop = async (server, instance) => {
  if (!server.pid) return;
  if (process.platform === "win32") {
    // Target the exact tree started by this runner, including Next workers.
    const killed = spawnSync(
      "taskkill",
      ["/PID", String(server.pid), "/T", "/F"],
      { encoding: "utf8" },
    );
    if (killed.status !== 0) server.kill("SIGTERM");
    // Next's development worker may outlive the launcher. Only terminate the
    // exact listener if its health identity matches this runner's instance.
    try {
      const response = await fetch("http://127.0.0.1:3101/health", {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok && (await response.json()).testInstance === instance) {
        const netstat = spawnSync("netstat", ["-ano", "-p", "TCP"], {
          encoding: "utf8",
        });
        const listener = netstat.stdout
          ?.split(/\r?\n/)
          .find((line) =>
            /^\s*TCP\s+127\.0\.0\.1:3101\s+\S+\s+LISTENING\s+\d+\s*$/.test(
              line,
            ),
          );
        const pid = listener?.trim().split(/\s+/).at(-1);
        if (pid && /^\d+$/.test(pid)) process.kill(Number(pid), "SIGTERM");
      }
    } catch {
      // Already stopped. The health check below confirms that before reuse.
    }
  } else {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      /* already exited */
    }
  }
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      await fetch("http://127.0.0.1:3101/health", {
        signal: AbortSignal.timeout(1000),
      });
    } catch {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Owned hosted E2E server still responds after cleanup");
};

const runPhase = async (phase) => {
  const instance = `${runId}-${phase}`;
  const server = spawn(
    process.execPath,
    [nextCli, "dev", "--hostname", "127.0.0.1", "--port", "3101"],
    {
      cwd: webRoot,
      detached: process.platform !== "win32",
      env: { ...environment, CAPACITY_GOVERNOR_E2E_INSTANCE: instance },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout.on("data", (chunk) => process.stdout.write(chunk));
  server.stderr.on("data", (chunk) => process.stderr.write(chunk));
  server.unref();
  try {
    const deadline = Date.now() + 120_000;
    let ready = false;
    while (Date.now() < deadline) {
      if (server.exitCode !== null)
        throw new Error("Hosted test server exited before ready");
      try {
        const response = await fetch("http://127.0.0.1:3101/health");
        if (response.ok && (await response.json()).testInstance === instance) {
          ready = true;
          break;
        }
      } catch {
        /* wait for listener */
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error("Hosted test server did not become ready");
    const tests = spawn(
      process.execPath,
      [playwrightCli, "test", "hosted-foundation.spec.ts", "--grep", phase],
      {
        cwd: repositoryRoot,
        env: environment,
        stdio: "inherit",
      },
    );
    const code = await new Promise((resolve) => tests.once("exit", resolve));
    if (code !== 0) throw new Error(`Hosted browser ${phase} failed`);
  } finally {
    await stop(server, instance);
    server.stdout.destroy();
    server.stderr.destroy();
  }
};

try {
  await runPhase("phase one");
  await runPhase("phase two");
  console.log(
    "Hosted browser evidence: PASS (fresh app process, persisted database, new session).",
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
