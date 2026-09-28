import { z } from "zod";
import { requireLocalAccess } from "../../../server/access";
import { getGovernedService } from "../../../server/governed-application";
const requestSchema = z
  .object({
    csrf: z.string(),
    projectId: z.uuid(),
    attemptId: z.uuid(),
    challenge: z.string(),
    confirmedExactAttempt: z.literal(true),
  })
  .strict();
export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const { cookie, boundary } = await requireLocalAccess(body.csrf, true);
    const service = await getGovernedService();
    const link = await boundary.confirmGoverned(
      cookie,
      body,
      (projectId, attemptId) => service.review(projectId, attemptId),
      (projectId, attemptId, actor, reference) =>
        service.create(projectId, attemptId, actor, reference),
    );
    return Response.json(
      {
        runUrl: `/projects/${body.projectId}/governed/${(link as { id: string }).id}`,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        error:
          "Exact one-use confirmation failed. Review the saved attempt again; no governed run was created.",
      },
      { status: 400 },
    );
  }
}
