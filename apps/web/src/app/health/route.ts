export function GET() {
  return Response.json(
    { status: "local" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
