import { NextResponse } from "next/server";
import { requireLocalAccess } from "../../../server/access";
import { configuredOrigin } from "../../../server/local-boundary";
import {
  accessMode,
  hostedConfiguration,
  hostedSessionCookieName,
} from "../../../server/hosted-config";
export async function POST(request: Request) {
  const data = await request.formData();
  const { boundary, cookie } = await requireLocalAccess(data.get("csrf"), true);
  await boundary.end(cookie);
  const local = accessMode() === "local";
  const response = NextResponse.redirect(
    new URL(
      local ? "/pair" : "/signin",
      local ? configuredOrigin() : hostedConfiguration().origin,
    ),
    303,
  );
  response.cookies.delete(local ? "cg_session" : hostedSessionCookieName());
  response.headers.set("Cache-Control", "no-store");
  return response;
}
