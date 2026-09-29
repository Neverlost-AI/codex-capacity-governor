import { NextResponse } from "next/server";
import { getHostedBoundary } from "../../../server/access";
import {
  accessMode,
  hostedConfiguration,
  hostedSessionCookieName,
  verifyHostedHeaders,
} from "../../../server/hosted-config";

// This route is unavailable in production, Vercel, and non-loopback origins.
// It lets browser tests use isolated principals without Google credentials.
export async function POST(request: Request) {
  if (accessMode() !== "hosted") return new Response(null, { status: 404 });
  const config = hostedConfiguration();
  if (!config.testMode) return new Response(null, { status: 404 });
  verifyHostedHeaders(request.headers, true);
  const form = await request.formData();
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
