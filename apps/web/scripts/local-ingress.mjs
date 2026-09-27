// A raw Node HTTP ingress hook, before Next synthesizes forwarding headers.
// Uses public Node APIs only. Supported launcher installs it in every Next worker.
import http from "node:http";
import { createHmac, randomBytes } from "node:crypto";
import process from "node:process";
import { Buffer } from "node:buffer";
import { URL } from "node:url";
const origin = process.env.CAPACITY_GOVERNOR_ORIGIN;
const key = process.env.CAPACITY_GOVERNOR_INGRESS_KEY;
if (
  !origin ||
  !/^http:\/\/127\.0\.0\.1:[1-9]\d{0,4}$/.test(origin) ||
  !key ||
  !/^[a-f0-9]{64}$/.test(key)
)
  throw new Error("Supported local launch required");
const host = new URL(origin).host;
const emit = http.Server.prototype.emit;
http.Server.prototype.emit = function (event, ...args) {
  if (event === "request" || event === "upgrade") {
    const [request, response] = args;
    const headers = request.headers;
    const forbidden = Object.keys(headers).some(
      (name) =>
        name === "forwarded" ||
        name.startsWith("x-forwarded-") ||
        name.startsWith("x-cg-ingress"),
    );
    const mutation =
      event === "upgrade" || !["GET", "HEAD"].includes(request.method);
    const hostCount = request.rawHeaders.filter(
      (value, index) => index % 2 === 0 && value.toLowerCase() === "host",
    ).length;
    if (
      forbidden ||
      hostCount !== 1 ||
      headers.host !== host ||
      (mutation && headers.origin !== origin)
    ) {
      if (event === "request") {
        response.writeHead(403, {
          "Content-Type": "text/plain",
          "Cache-Control": "no-store",
        });
        response.end("Local access boundary denied");
      } else {
        response.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      }
      return true;
    }
    const context = JSON.stringify([
      request.method,
      request.url,
      headers.host,
      headers.origin ?? null,
      randomBytes(32).toString("hex"),
    ]);
    headers["x-cg-ingress-context"] =
      Buffer.from(context).toString("base64url");
    headers["x-cg-ingress-proof"] = createHmac("sha256", key)
      .update(context)
      .digest("hex");
  }
  return emit.call(this, event, ...args);
};
