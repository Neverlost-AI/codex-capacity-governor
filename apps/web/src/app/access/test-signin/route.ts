import { NextResponse } from "next/server";
import { getHostedBoundary } from "../../../server/access";
import {
  accessMode,
  hostedConfiguration,
  hostedSessionCookieName,
  verifyHostedHeaders,
  verifyHostedTestSecret,
} from "../../../server/hosted-config";

// This route requires the signed loopback ingress and a separate, unrendered
// test credential. It is disabled in production and on Vercel.
export async function POST(request: Request) {
  if (accessMode() !== "hosted") return new Response(null, { status: 404 });
  const config = hostedConfiguration();
  if (!config.testMode) return new Response(null, { status: 404 });
  let form: FormData;
  try {
    verifyHostedHeaders(request.headers, true);
    form = await request.formData();
    if (!verifyHostedTestSecret(form.get("testSecret")))
      throw new Error("Test access denied");
  } catch {
    return new Response("Test access denied", { status: 403 });
  }
  const choice = form.get("identity");
  if (choice !== "founder" && choice !== "secondary")
    return new Response("Unknown local test identity", { status: 400 });
  const subject =
    choice === "founder" ? config.subject : "local-test-secondary";
  const cookie = await (
    await getHostedBoundary()
  ).createTestSession(config.issuer, subject);
  const response = NextResponse.redirect(new URL("/", config.origin), 303);
  response.cookies.set(hostedSessionCookieName(), cookie, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
