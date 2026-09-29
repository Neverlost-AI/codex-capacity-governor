import type { ComposedRevision } from "@capacity-governor/contracts";
import { z } from "zod";
import { requireLocalAccess } from "../../../server/access";
import type { AppDatabase } from "../../../server/db/database";
import {
  createComposedServiceForDatabase,
  getComposedService,
} from "../../../server/composed-application";
const confirmation = z
  .object({
    csrf: z.string(),
    revisionId: z.uuid(),
    challenge: z.string(),
    confirmedWorkInputs: z.literal(true),
    confirmedRequiredBuckets: z.literal(true),
  })
  .strict();
export async function POST(request: Request) {
  try {
    const body = confirmation.parse(await request.json());
    const { cookie, boundary, session } = await requireLocalAccess(
      body.csrf,
      true,
    );
    const service = await getComposedService();
    const operation = {
      revisionId: body.revisionId,
      challenge: body.challenge,
      confirmedWorkInputs: body.confirmedWorkInputs,
      confirmedRequiredBuckets: body.confirmedRequiredBuckets,
    };
    const saved = await boundary.confirm(
      cookie,
      operation,
      (
        revision: ComposedRevision,
        actor: string,
        digest: string,
        transaction?: AppDatabase,
      ) =>
        transaction
          ? createComposedServiceForDatabase(
              transaction,
              session.ownerKey,
            ).confirm(revision, actor, digest)
          : service.confirm(revision, actor, digest),
    );
    return Response.json(
      {
        resultUrl: `/projects/${saved.revision.input.projectId}/preflight/results/${saved.id}`,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        error:
          "No saved result was confirmed. Check the local session and reviewed inputs, or retry the same confirmation after a database failure. Editing requires a new review.",
      },
      { status: 400 },
    );
  }
}
