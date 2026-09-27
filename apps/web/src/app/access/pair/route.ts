import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getLocalBoundary,
  verifyLocalHeaders,
  configuredOrigin,
} from "../../../server/local-boundary";
export async function POST(request: Request) {
  try {
    verifyLocalHeaders(request.headers, true);
    const fields = z
      .object({ secret: z.string(), bootstrap: z.string() })
      .strict()
      .parse(Object.fromEntries(await request.formData()));
    const cookie = getLocalBoundary().pair(fields.secret, fields.bootstrap);
    const response = NextResponse.redirect(
      new URL("/", configuredOrigin()),
      303,
    );
    response.cookies.set("cg_session", cookie, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.redirect(
      new URL("/pair?error=1", configuredOrigin()),
      303,
    );
  }
}
