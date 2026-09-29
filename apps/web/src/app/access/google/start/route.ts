import { NextResponse } from "next/server";
import { getHostedBoundary } from "../../../../server/access";
import {
  accessMode,
  hostedConfiguration,
  hostedStateCookieName,
} from "../../../../server/hosted-config";
import { googleAuthorizationUrl } from "../../../../server/google-oidc";

export async function GET() {
  if (accessMode() !== "hosted") return new Response(null, { status: 404 });
  const config = hostedConfiguration();
  if (config.testMode) return new Response(null, { status: 404 });
  const state = await (await getHostedBoundary()).createLoginState();
  const response = NextResponse.redirect(
    googleAuthorizationUrl(config, state.state, state.nonce, state.verifier),
    303,
  );
  response.cookies.set(hostedStateCookieName(), state.state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
