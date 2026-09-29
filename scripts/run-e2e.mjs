import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { createE2ETerminalSink } from "./e2e-log-hygiene.mjs";

const repositoryRoot = process.cwd();
const webRoot = path.join(repositoryRoot, "apps", "web");
const localLauncher = path.join(webRoot, "scripts", "local-launch.mjs");
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

let pairingSecret;
let terminalHygieneFailure = false;
const mode = process.env.CAPACITY_GOVERNOR_E2E_BUILT === "1" ? "start" : "dev";
const server = spawn(
  process.execPath,
  [localLauncher, mode, "--port", "3100"],
  {
    cwd: webRoot,
    detached: process.platform !== "win32",
    env: environment,
    stdio: ["ignore", "pipe", "pipe"],
  },
);
const protectedWrite = (write, value) => {
  if (value.includes("T005_BROWSER_LOG_HYGIENE_PROBE_NON_SECRET"))
    terminalHygieneFailure = true;
  write(value);
};
const stdoutSink = createE2ETerminalSink(
  (value) => protectedWrite((value) => process.stdout.write(value), value),
  (value) => {
    pairingSecret = value;
  },
  () => {
    terminalHygieneFailure = true;
  },
);
const stderrSink = createE2ETerminalSink(
  (value) => protectedWrite((value) => process.stderr.write(value), value),
  (value) => {
    pairingSecret = value;
  },
  () => {
    terminalHygieneFailure = true;
  },
);
server.stdout.on("data", (chunk) => stdoutSink.push(chunk));
server.stdout.on("end", () => stdoutSink.end());
server.stderr.on("data", (chunk) => stderrSink.push(chunk));
server.stderr.on("end", () => stderrSink.end());
server.unref();

const stopServer = async () => {
  if (!server.pid) return;
  if (process.platform === "win32") {
    const stopped = spawnSync(
      "taskkill",
      ["/PID", String(server.pid), "/T", "/F"],
      {
        stdio: "ignore",
      },
    );
    if (stopped.status !== 0) server.kill("SIGTERM");
    // The launcher may already have exited before taskkill runs. A nonzero
    // taskkill result is safe only when the exact test port has no listener.
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      const listeners = spawnSync("netstat", ["-ano", "-p", "TCP"], {
        encoding: "utf8",
      });
      if (
        listeners.status === 0 &&
        !listeners.stdout
          .split(/\r?\n/)
          .some((line) =>
            /^\s*TCP\s+127\.0\.0\.1:3100\s+\S+\s+LISTENING\s+\d+\s*$/.test(
              line,
            ),
          )
      ) {
        if (stopped.status !== 0)
          console.warn(
            `Owned E2E launcher ${server.pid} taskkill returned ${stopped.error?.code ?? stopped.status}; port 3100 has no listener.`,
          );
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(
      `Owned E2E server tree ${server.pid} cleanup failed (${stopped.error?.code ?? stopped.status}); port 3100 still has a listener.`,
    );
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
      const response = await fetch("http://127.0.0.1:3100/health");
      if (response.ok && pairingSecret) return;
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
    env: {
      ...environment,
      CAPACITY_GOVERNOR_E2E_PAIRING_SECRET: pairingSecret,
    },
    stdio: "inherit",
  });
  const exitCode = await new Promise((resolve) => tests.once("exit", resolve));
  process.exitCode = typeof exitCode === "number" ? exitCode : 1;
  if (terminalHygieneFailure) {
    console.error(
      "E2E terminal hygiene failed: boundary token redacted or browser forwarding detected (no values reported).",
    );
    process.exitCode = 1;
  } else
    console.log(
      "E2E terminal hygiene: PASS (no boundary tokens or browser forwarding).",
    );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  try {
    await stopServer();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
    server.stdout.destroy();
    server.stderr.destroy();
  }
}
