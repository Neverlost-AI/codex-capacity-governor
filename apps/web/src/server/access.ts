import { headers, cookies } from "next/headers";
import { getDatabaseConnection } from "./db/database";
import { HostedBoundary } from "./hosted-boundary";
import {
  accessMode,
  hostedConfiguration,
  hostedSessionCookieName,
  verifyHostedHeaders,
} from "./hosted-config";
import { getLocalBoundary, verifyLocalHeaders } from "./local-boundary";
export const getHostedBoundary = async () => {
  const { db } = await getDatabaseConnection();
  return new HostedBoundary(db, hostedConfiguration());
};

export const requireAccess = async (csrf?: unknown, mutation = false) => {
  const requestHeaders = await headers();
  const local = accessMode() === "local";
  if (local) verifyLocalHeaders(requestHeaders, mutation);
  else verifyHostedHeaders(requestHeaders, mutation);
  const cookie = (await cookies()).get(
    local ? "cg_session" : hostedSessionCookieName(),
  )?.value;
  const boundary = local ? getLocalBoundary() : await getHostedBoundary();
  const session = mutation
    ? await boundary.mutation(cookie, csrf)
    : await boundary.session(cookie);
  return { cookie: cookie!, session, boundary };
};

// Existing call sites keep this alias while both access modes use the same
// server-side authorization boundary. No hosted request passes local ingress.
export const requireLocalAccess = requireAccess;
