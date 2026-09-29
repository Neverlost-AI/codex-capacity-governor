import { z } from "zod";
import { composedInputSchema } from "@capacity-governor/contracts";
import { requireLocalAccess } from "../../../server/access";
import { getComposedService } from "../../../server/composed-application";
export async function POST(request: Request) {
  try {
    const body = z
      .object({ csrf: z.string(), input: composedInputSchema })
      .strict()
      .parse(await request.json());
    const { cookie, boundary } = await requireLocalAccess(body.csrf, true);
    const revision = await (await getComposedService()).prepare(body.input);
    await boundary.review(cookie, revision);
    return Response.json(
      {
        reviewUrl: `/projects/${revision.input.projectId}/preflight/review/${revision.id}`,
      },
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
            : "Review could not be prepared. Confirm the project/draft, local session and database, then retry. Inputs have not been saved as an evaluation.",
      },
      { status: 400 },
    );
  }
}
