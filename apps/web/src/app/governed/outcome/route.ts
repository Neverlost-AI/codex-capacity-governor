import { z } from "zod";
import { governedOutcomeInputSchema } from "@capacity-governor/contracts";
import { requireLocalAccess } from "../../../server/access";
import { getGovernedService } from "../../../server/governed-application";
const requestSchema = z
  .object({
    csrf: z.string(),
    runId: z.uuid(),
    input: governedOutcomeInputSchema,
    predecessorId: z.uuid().optional(),
    amendmentReason: z.string().optional(),
  })
  .strict();
export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const { session } = await requireLocalAccess(body.csrf, true);
    const service = await getGovernedService();
    const result = body.predecessorId
      ? await service.amend(
          body.runId,
          body.predecessorId,
          body.amendmentReason ?? "",
          body.input,
          session.actorReference,
        )
      : await service.record(body.runId, body.input, session.actorReference);
    return Response.json(
      { observationId: result.id },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof z.ZodError
            ? error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join("; ")
            : "Outcome could not be saved. A stale amendment or invalid evidence may require reopening this run.",
      },
      { status: 400 },
    );
  }
}
