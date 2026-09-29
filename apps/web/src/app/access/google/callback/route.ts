import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getHostedBoundary } from "../../../../server/access";
import {
  accessMode,
  hostedConfiguration,
  hostedSessionCookieName,
  hostedStateCookieName,
} from "../../../../server/hosted-config";
import {
  exchangeGoogleCode,
  verifyGoogleIdToken,
} from "../../../../server/google-oidc";

export async function GET(request: Request) {
  if (accessMode() !== "hosted") return new Response(null, { status: 404 });
  const config = hostedConfiguration();
  if (config.testMode) return new Response(null, { status: 404 });
  const response = NextResponse.redirect(
    new URL("/signin?error=1", config.origin),
    303,
  );
  response.cookies.delete(hostedStateCookieName());
  response.headers.set("Cache-Control", "no-store");
  try {
    const url = new URL(request.url);
    const state = url.searchParams.get("state");
    const code = url.searchParams.get("code");
    const cookieState = (await cookies()).get(hostedStateCookieName())?.value;
    if (
      !state ||
      !code ||
      !cookieState ||
      state.length !== cookieState.length ||
      !timingSafeEqual(Buffer.from(state), Buffer.from(cookieState))
    )
      throw new Error("OAuth state mismatch");
    const boundary = await getHostedBoundary();
    const challenge = await boundary.consumeLoginState(state);
    const idToken = await exchangeGoogleCode(code, challenge.verifier, config);
    const identity = await verifyGoogleIdToken(
      idToken,
      config,
      challenge.nonce,
    );
    const session = await boundary.admitVerifiedIdentity(
      identity.issuer,
      identity.subject,
    );
    const admitted = NextResponse.redirect(new URL("/", config.origin), 303);
    admitted.cookies.delete(hostedStateCookieName());
    admitted.cookies.set(hostedSessionCookieName(), session, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 12 * 60 * 60,
    });
    admitted.headers.set("Cache-Control", "no-store");
    return admitted;
  } catch {
    return response;
  }
}
