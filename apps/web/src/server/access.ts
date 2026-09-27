import { headers, cookies } from "next/headers";
import { getLocalBoundary, verifyLocalHeaders } from "./local-boundary";
export const requireLocalAccess = async (csrf?: unknown, mutation = false) => {
  verifyLocalHeaders(await headers(), mutation);
  const cookie = (await cookies()).get("cg_session")?.value;
  const boundary = getLocalBoundary();
  const session = mutation
    ? boundary.mutation(cookie, csrf)
    : boundary.session(cookie);
  return { cookie: cookie!, session, boundary };
};
