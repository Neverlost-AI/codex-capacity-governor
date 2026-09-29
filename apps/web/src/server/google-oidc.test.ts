import { afterEach, describe, expect, it, vi } from "vitest";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { googleAuthorizationUrl, verifyGoogleIdToken } from "./google-oidc";
import {
  accessMode,
  hostedConfiguration,
  hostedTestMode,
  ownerKeyFor,
  verifyHostedHeaders,
} from "./hosted-config";

const config = {
  origin: "https://governor.example.test",
  issuer: "https://accounts.google.com",
  subject: "founder-subject",
  sessionKey: "test-key-with-more-than-thirty-two-characters",
  clientId: "test-client",
  clientSecret: "test-secret",
  testMode: false,
} satisfies ReturnType<typeof hostedConfiguration>;
afterEach(() => vi.unstubAllEnvs());

describe("hosted configuration and Google OIDC proof", () => {
  it("fails closed on unsupported mode, missing allowlist, insecure hosted origin and test-auth deployment", () => {
    vi.stubEnv("CAPACITY_GOVERNOR_MODE", "unexpected");
    expect(accessMode).toThrow("Unsupported");
    vi.stubEnv("CAPACITY_GOVERNOR_MODE", "hosted");
    vi.stubEnv("CAPACITY_GOVERNOR_ORIGIN", "http://governor.example.test");
    expect(hostedConfiguration).toThrow("HTTPS");
    vi.stubEnv("CAPACITY_GOVERNOR_HOSTED_TEST_AUTH", "1");
    expect(hostedTestMode).toThrow("forbidden");
    vi.stubEnv("CAPACITY_GOVERNOR_HOSTED_TEST_AUTH", "");
    vi.stubEnv("CAPACITY_GOVERNOR_ORIGIN", config.origin);
    expect(hostedConfiguration).toThrow("founder identity");
  });

  it("requires exact Host and Origin, and owner keys preserve issuer/subject identity", () => {
    vi.stubEnv("CAPACITY_GOVERNOR_MODE", "hosted");
    vi.stubEnv("CAPACITY_GOVERNOR_ORIGIN", config.origin);
    vi.stubEnv("CAPACITY_GOVERNOR_FOUNDER_ISSUER", config.issuer);
    vi.stubEnv("CAPACITY_GOVERNOR_FOUNDER_SUBJECT", config.subject);
    vi.stubEnv("CAPACITY_GOVERNOR_SESSION_KEY", config.sessionKey);
    vi.stubEnv("GOOGLE_CLIENT_ID", config.clientId);
    vi.stubEnv("GOOGLE_CLIENT_SECRET", config.clientSecret);
    expect(() =>
      verifyHostedHeaders(
        new Headers({ host: "governor.example.test", origin: config.origin }),
        true,
      ),
    ).not.toThrow();
    expect(() =>
      verifyHostedHeaders(
        new Headers({
          host: "governor.example.test",
          origin: "https://attacker.test",
        }),
        true,
      ),
    ).toThrow("Host/Origin");
    expect(() =>
      verifyHostedHeaders(
        new Headers({ host: "attacker.test", origin: config.origin }),
        true,
      ),
    ).toThrow("Host/Origin");
    expect(ownerKeyFor("issuer:a", "b")).not.toBe(ownerKeyFor("issuer", "a:b"));
  });

  it("uses authorization code, state, nonce and S256 PKCE without email-based authority", () => {
    const url = googleAuthorizationUrl(config, "state", "nonce", "verifier");
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("state")).toBe("state");
    expect(url.searchParams.get("nonce")).toBe("nonce");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("redirect_uri")).toBe(
      `${config.origin}/access/google/callback`,
    );
    expect(url.searchParams.get("scope")).toBe("openid");
  });

  it("verifies signature, issuer, audience, expiry and nonce before returning stable subject", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const jwk = await exportJWK(publicKey);
    const keys = createLocalJWKSet({
      keys: [{ ...jwk, kid: "test-key", alg: "RS256", use: "sig" }],
    });
    const signed = (
      claims: Record<string, string>,
      issuer = config.issuer,
      audience = config.clientId,
      expiry = "10m",
    ) =>
      new SignJWT({
        nonce: "matching-nonce",
        email: "not-authority@example.test",
        ...claims,
      })
        .setProtectedHeader({ alg: "RS256", kid: "test-key" })
        .setIssuer(issuer)
        .setAudience(audience)
        .setSubject(config.subject)
        .setIssuedAt()
        .setExpirationTime(expiry)
        .sign(privateKey);
    const valid = await signed({});
    await expect(
      verifyGoogleIdToken(valid, config, "matching-nonce", keys),
    ).resolves.toEqual({ issuer: config.issuer, subject: config.subject });
    await expect(
      verifyGoogleIdToken(valid, config, "wrong-nonce", keys),
    ).rejects.toThrow("mismatched");
    await expect(
      verifyGoogleIdToken(
        await signed({}, "https://other.test"),
        config,
        "matching-nonce",
        keys,
      ),
    ).rejects.toThrow();
    await expect(
      verifyGoogleIdToken(
        await signed({}, config.issuer, "wrong-client"),
        config,
        "matching-nonce",
        keys,
      ),
    ).rejects.toThrow();
    await expect(
      verifyGoogleIdToken(
        await signed({}, config.issuer, config.clientId, "-10s"),
        config,
        "matching-nonce",
        keys,
      ),
    ).rejects.toThrow();
    const futureIssued = await new SignJWT({ nonce: "matching-nonce" })
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setIssuer(config.issuer)
      .setAudience(config.clientId)
      .setSubject(config.subject)
      .setIssuedAt(Math.floor(Date.now() / 1000) + 60)
      .setExpirationTime("10m")
      .sign(privateKey);
    await expect(
      verifyGoogleIdToken(futureIssued, config, "matching-nonce", keys),
    ).rejects.toThrow("mismatched");
  });
});
