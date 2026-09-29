import { createHash, timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import type { HostedConfiguration } from "./hosted-config";

const authorizationEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
const tokenEndpoint = "https://oauth2.googleapis.com/token";
const googleKeys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

export const googleAuthorizationUrl = (
  config: HostedConfiguration,
  state: string,
  nonce: string,
  verifier: string,
) => {
  const url = new URL(authorizationEndpoint);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set(
    "redirect_uri",
    `${config.origin}/access/google/callback`,
  );
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set(
    "code_challenge",
    createHash("sha256").update(verifier).digest("base64url"),
  );
  return url;
};

export const verifyGoogleIdToken = async (
  idToken: string,
  config: HostedConfiguration,
  nonce: string,
  keys: JWTVerifyGetKey = googleKeys,
) => {
  const { payload } = await jwtVerify(idToken, keys, {
    issuer: config.issuer,
    audience: config.clientId,
    algorithms: ["RS256"],
  });
  if (
    typeof payload.sub !== "string" ||
    !payload.sub ||
    typeof payload.exp !== "number" ||
    typeof payload.iat !== "number" ||
    payload.iat > Math.floor(Date.now() / 1000) ||
    typeof payload.nonce !== "string" ||
    payload.nonce.length !== nonce.length ||
    !timingSafeEqual(Buffer.from(payload.nonce), Buffer.from(nonce))
  )
    throw new Error("Incomplete or mismatched Google identity evidence");
  return { issuer: payload.iss!, subject: payload.sub };
};

export const exchangeGoogleCode = async (
  code: string,
  verifier: string,
  config: HostedConfiguration,
  fetcher: typeof fetch = fetch,
) => {
  const response = await fetcher(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: `${config.origin}/access/google/callback`,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Google code exchange rejected");
  const data: unknown = await response.json();
  if (
    !data ||
    typeof data !== "object" ||
    !("id_token" in data) ||
    typeof data.id_token !== "string"
  )
    throw new Error("Google response lacks an ID token");
  return data.id_token;
};
