import { NextResponse } from "next/server";
import { requireLocalAccess } from "../../../server/access";
import { configuredOrigin } from "../../../server/local-boundary";
export async function POST(request: Request) {
  const data = await request.formData();
  const { boundary, cookie } = await requireLocalAccess(data.get("csrf"), true);
  boundary.end(cookie);
  const response = NextResponse.redirect(
    new URL("/pair", configuredOrigin()),
    303,
  );
  response.cookies.delete("cg_session");
  response.headers.set("Cache-Control", "no-store");
  return response;
}
