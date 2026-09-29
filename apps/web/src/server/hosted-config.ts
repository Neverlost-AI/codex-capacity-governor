export const accessMode = (): "local" | "hosted" => {
  const value = process.env.CAPACITY_GOVERNOR_MODE ?? "local";
  if (value !== "local" && value !== "hosted")
    throw new Error("Unsupported Capacity Governor access mode");
  return value;
};

export const hostedTestMode = () => {
  if (process.env.CAPACITY_GOVERNOR_HOSTED_TEST_AUTH !== "1") return false;
  const origin = process.env.CAPACITY_GOVERNOR_ORIGIN;
  if (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL ||
    !origin ||
    !/^http:\/\/127\.0\.0\.1:[1-9]\d{0,4}$/.test(origin)
  )
    throw new Error(
      "Hosted test identity is forbidden outside local development",
    );
  return true;
};

export const hostedConfiguration = () => {
  if (accessMode() !== "hosted") throw new Error("Hosted mode required");
  const origin = process.env.CAPACITY_GOVERNOR_ORIGIN;
  const testMode = hostedTestMode();
  if (
    !origin ||
    (!testMode && !/^https:\/\/[^/?#]+$/.test(origin)) ||
    new URL(origin).origin !== origin
  )
    throw new Error("A fixed HTTPS hosted origin is required");
  const issuer = process.env.CAPACITY_GOVERNOR_FOUNDER_ISSUER;
  const subject = process.env.CAPACITY_GOVERNOR_FOUNDER_SUBJECT;
  const sessionKey = process.env.CAPACITY_GOVERNOR_SESSION_KEY;
  if (
    !issuer ||
    !["https://accounts.google.com", "accounts.google.com"].includes(issuer) ||
    !subject ||
    !subject.trim() ||
    !sessionKey ||
    sessionKey.length < 32
  )
    throw new Error("Exact founder identity and session key are required");
  if (
    !testMode &&
    (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET)
  )
    throw new Error("Google OIDC client configuration is required");
  return {
    origin,
    issuer,
    subject,
    sessionKey,
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    testMode,
  };
};

export type HostedConfiguration = ReturnType<typeof hostedConfiguration>;
export const ownerKeyFor = (issuer: string, subject: string) =>
  `oidc:${JSON.stringify([issuer, subject])}`;
export const hostedSessionCookieName = () =>
  hostedTestMode() ? "cg_hosted_test_session" : "__Host-cg_session";
export const hostedStateCookieName = () =>
  hostedTestMode() ? "cg_hosted_test_oidc_state" : "__Host-cg_oidc_state";

export const verifyHostedHeaders = (
  requestHeaders: Headers,
  mutation: boolean,
) => {
  const { origin } = hostedConfiguration();
  if (
    requestHeaders.get("host") !== new URL(origin).host ||
    (mutation && requestHeaders.get("origin") !== origin)
  )
    throw new Error("Hosted Host/Origin boundary denied");
};
