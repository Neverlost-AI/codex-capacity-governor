import { NextResponse, type NextRequest } from "next/server";
import { verifyLocalHeaders } from "./server/local-boundary";
// No secrets/session state in proxy: action/service guards independently authorize product access.
export function proxy(request: NextRequest) {
  try {
    verifyLocalHeaders(
      request.headers,
      !["GET", "HEAD"].includes(request.method),
    );
  } catch {
    return new NextResponse("Local access boundary denied", { status: 403 });
  }
  const headers = new Headers(request.headers);
  headers.set("x-cg-path", request.nextUrl.pathname);
  return NextResponse.next({
    request: { headers },
    headers: { "Cache-Control": "no-store" },
  });
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
