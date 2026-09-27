import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
export const localLaunch = (mode, args, environment) => {
  if (!["dev", "start"].includes(mode))
    throw new Error("Unsupported local launch mode");
  const hostIndex = args.findIndex((value) =>
    ["--hostname", "-H"].includes(value),
  );
  if (
    (environment.HOST && environment.HOST !== "127.0.0.1") ||
    hostIndex >= 0 ||
    args.some((value) => value.startsWith("--hostname="))
  )
    throw new Error(
      "Only supported loopback launch is allowed; do not override hostname",
    );
  const portIndex = args.findIndex((value) => ["--port", "-p"].includes(value));
  const port =
    portIndex < 0 ? (environment.PORT ?? "3000") : args[portIndex + 1];
  if (!/^\d+$/.test(port ?? "") || Number(port) < 1 || Number(port) > 65535)
    throw new Error("Invalid local port");
  const ingress = new URL("./local-ingress.mjs", import.meta.url).href;
  return {
    args: [mode, ...args, "--hostname", "127.0.0.1"],
    env: {
      ...environment,
      CAPACITY_GOVERNOR_ORIGIN: `http://127.0.0.1:${port}`,
      CAPACITY_GOVERNOR_INGRESS_KEY: randomBytes(32).toString("hex"),
      NODE_OPTIONS:
        `${environment.NODE_OPTIONS ?? ""} --import "${ingress}"`.trim(),
    },
  };
};
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const launch = localLaunch(
    process.argv[2],
    process.argv.slice(3),
    process.env,
  );
  const child = spawn(
    process.execPath,
    [
      fileURLToPath(
        new URL("../node_modules/next/dist/bin/next", import.meta.url),
      ),
      ...launch.args,
    ],
    { stdio: "inherit", env: launch.env },
  );
  child.on("exit", (code) => {
    process.exitCode = code ?? 1;
  });
}
