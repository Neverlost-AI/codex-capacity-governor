import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createServer as createSocket } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const host = "127.0.0.1";
const assessorDirectory = path.dirname(fileURLToPath(import.meta.url));

export function targetDirectory() {
  const target = process.env.T007_TARGET_DIR;
  if (!target || !path.isAbsolute(target)) {
    throw new Error(
      "Set T007_TARGET_DIR to the absolute path of a disposable challenge checkout",
    );
  }
  return path.resolve(target);
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const socket = createSocket();
    socket.once("error", reject);
    socket.listen(0, host, () => {
      const address = socket.address();
      socket.close(() => resolve(address.port));
    });
  });
}

async function ready(url, child) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `Challenge server exited before readiness (code ${child.exitCode})`,
      );
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(500) });
      await response.body?.cancel();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("Challenge server did not become ready within 10 seconds");
}

export async function startNodeApp(target, { fixedClock = false } = {}) {
  const port = await freePort();
  const entry = path.join(target, "index.js");
  await stat(entry);
  const args = fixedClock
    ? ["--require", path.join(assessorDirectory, "fixed-clock.cjs"), entry]
    : [entry];
  const child = spawn(process.execPath, args, {
    cwd: target,
    env: { ...process.env, PORT: String(port), TZ: "UTC" },
    stdio: "ignore",
  });
  const url = `http://${host}:${port}`;
  try {
    await ready(url, child);
  } catch (error) {
    child.kill();
    throw error;
  }
  return { url, child };
}

export async function stopNodeApp(app) {
  if (!app || app.child.exitCode !== null) return;
  const exited = new Promise((resolve) => app.child.once("exit", resolve));
  app.child.kill();
  await Promise.race([
    exited,
    new Promise((resolve) => setTimeout(resolve, 3_000)),
  ]);
}

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

export async function startStaticApp(target) {
  const root = path.resolve(target);
  const server = createServer(async (request, response) => {
    let filename;
    try {
      const pathname = decodeURIComponent(
        new URL(request.url, "http://localhost").pathname,
      );
      if (
        request.method !== "GET" ||
        pathname.split("/").some((segment) => segment.startsWith("."))
      ) {
        response.writeHead(403).end();
        return;
      }
      filename = path.resolve(
        root,
        `.${pathname === "/" ? "/index.html" : pathname}`,
      );
      if (filename !== root && !filename.startsWith(`${root}${path.sep}`)) {
        response.writeHead(403).end();
        return;
      }
      const bytes = await readFile(filename);
      response.writeHead(200, {
        "content-type":
          contentTypes[path.extname(filename)] ?? "application/octet-stream",
      });
      response.end(bytes);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, host, resolve);
  });
  return {
    url: `http://${host}:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
