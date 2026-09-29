import { accessMode, hostedTestMode } from "../../server/hosted-config";
export function GET() {
  return Response.json(
    {
      status: accessMode(),
      ...(accessMode() === "hosted" && hostedTestMode()
        ? { testInstance: process.env.CAPACITY_GOVERNOR_E2E_INSTANCE }
        : {}),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
