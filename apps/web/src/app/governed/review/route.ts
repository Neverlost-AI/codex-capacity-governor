import { z } from "zod";
import { requireLocalAccess } from "../../../server/access";
import { getGovernedService } from "../../../server/governed-application";
const requestSchema = z
  .object({ csrf: z.string(), projectId: z.uuid(), attemptId: z.uuid() })
  .strict();
export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const { cookie, boundary } = await requireLocalAccess(body.csrf, true);
    const attempt = await (
      await getGovernedService()
    ).review(body.projectId, body.attemptId);
    return Response.json(await boundary.reviewGoverned(cookie, attempt), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      {
        error:
          "This saved evaluation is ineligible, already linked, or unavailable. No run was created.",
      },
      { status: 400 },
    );
  }
}
