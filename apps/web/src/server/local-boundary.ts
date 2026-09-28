import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import {
  canonicalizeComposed,
  type ComposedRevision,
  type ComposedAttempt,
} from "@capacity-governor/contracts";

export const localDigest = (value: string) =>
  createHash("sha256").update(value, "utf8").digest("hex");
const token = () => randomBytes(32).toString("hex");
const same = (left: string, right: string) =>
  left.length === right.length &&
  timingSafeEqual(Buffer.from(left), Buffer.from(right));
export const configuredOrigin = () => {
  const origin = process.env.CAPACITY_GOVERNOR_ORIGIN;
  if (
    !origin ||
    !/^http:\/\/127\.0\.0\.1:[1-9]\d{0,4}$/.test(origin) ||
    Number(new URL(origin).port) > 65535
  )
    throw new Error("Launch through the supported loopback command");
  return origin;
};
export const verifyLocalHeaders = (
  headers: Headers,
  mutation: boolean,
  origin = configuredOrigin(),
) => {
  const key = process.env.CAPACITY_GOVERNOR_INGRESS_KEY;
  const context = headers.get("x-cg-ingress-context");
  const proof = headers.get("x-cg-ingress-proof");
  if (!key || !context || !proof)
    throw new Error("Supported local ingress required");
  const decoded = Buffer.from(context, "base64url").toString("utf8");
  if (!same(proof, createHmac("sha256", key).update(decoded).digest("hex")))
    throw new Error("Local ingress denied");
  const claimed: unknown = JSON.parse(decoded);
  if (
    !Array.isArray(claimed) ||
    claimed.length !== 5 ||
    claimed[2] !== headers.get("host") ||
    claimed[3] !== headers.get("origin") ||
    (mutation && claimed[0] !== "POST") ||
    headers.get("host") !== new URL(origin).host ||
    (mutation && headers.get("origin") !== origin)
  )
    throw new Error("Local Host/Origin boundary denied");
  // Forwarding absence was established before Next; the signed per-request
  // startup-bound admission proof is not actor or bucket authority.
};
export type LocalSession = { actorReference: string; csrf: string };
type Review = {
  sessionToken: string;
  revision: ComposedRevision;
  digest: string;
  challenge: string;
  createdAt: number;
  result?: ComposedAttempt;
  inFlight?: Promise<ComposedAttempt>;
};
type GovernedReview = {
  sessionToken: string;
  projectId: string;
  attemptId: string;
  binding: string;
  challenge: string;
  createdAt: number;
};
export class LocalBoundary {
  private readonly secret = token();
  private readonly sessions = new Map<string, LocalSession>();
  private readonly bootstraps = new Map<string, number>();
  private readonly reviews = new Map<string, Review>();
  private readonly governedReviews = new Map<string, GovernedReview>();
  constructor(private readonly now: () => number = Date.now) {}
  presentPairingSecret(present: (secret: string) => void) {
    present(this.secret);
  }
  bootstrap() {
    const value = token();
    this.bootstraps.set(value, this.now());
    return value;
  }
  pair(secret: string, bootstrap: string) {
    const issued = this.bootstraps.get(bootstrap);
    this.bootstraps.delete(bootstrap);
    if (
      issued === undefined ||
      this.now() - issued > 15 * 60 * 1000 ||
      !same(secret, this.secret)
    )
      throw new Error(
        "Pairing denied. Reload the pairing form and use the local terminal secret.",
      );
    const cookie = token();
    this.sessions.set(cookie, {
      actorReference: `local-session:${randomUUID()}`,
      csrf: token(),
    });
    return cookie;
  }
  session(cookie: string | undefined) {
    const session = cookie ? this.sessions.get(cookie) : undefined;
    if (!session) throw new Error("Paired session required");
    return session;
  }
  mutation(cookie: string | undefined, csrf: unknown) {
    const session = this.session(cookie);
    if (typeof csrf !== "string" || !same(csrf, session.csrf))
      throw new Error("Session CSRF evidence required");
    return session;
  }
  end(cookie: string) {
    this.sessions.delete(cookie);
    for (const [id, review] of this.reviews)
      if (review.sessionToken === cookie) this.reviews.delete(id);
    for (const [id, review] of this.governedReviews)
      if (review.sessionToken === cookie) this.governedReviews.delete(id);
  }
  private governedBinding(attempt: ComposedAttempt) {
    return localDigest(
      canonicalizeComposed({
        attemptId: attempt.id,
        projectId: attempt.revision.input.projectId,
        draftId: attempt.revision.input.preflightDraftId,
        revisionId: attempt.revision.id,
        revisionDigest: attempt.receipt.canonicalDigest,
        receiptId: attempt.receipt.id,
        resultFamily: attempt.policy?.kind ?? attempt.forecast.kind,
        buckets: attempt.receipt.buckets
          .map((bucket) => [
            bucket.bucketId,
            bucket.providerId,
            bucket.capacityWindowId,
            bucket.resetCycleId,
          ])
          .sort((left, right) =>
            JSON.stringify(left).localeCompare(JSON.stringify(right)),
          ),
      }),
    );
  }
  reviewGoverned(cookie: string, attempt: ComposedAttempt) {
    this.session(cookie);
    const challenge = token();
    this.governedReviews.set(challenge, {
      sessionToken: cookie,
      projectId: attempt.revision.input.projectId,
      attemptId: attempt.id,
      binding: this.governedBinding(attempt),
      challenge,
      createdAt: this.now(),
    });
    return { challenge, attempt: structuredClone(attempt) };
  }
  async confirmGoverned(
    cookie: string,
    request: {
      projectId: string;
      attemptId: string;
      challenge: string;
      confirmedExactAttempt: true;
    },
    reread: (projectId: string, attemptId: string) => Promise<ComposedAttempt>,
    create: (
      projectId: string,
      attemptId: string,
      actor: string,
      reference: string,
    ) => Promise<unknown>,
  ) {
    const session = this.session(cookie);
    const review = this.governedReviews.get(request.challenge);
    if (
      !review ||
      review.sessionToken !== cookie ||
      review.projectId !== request.projectId ||
      review.attemptId !== request.attemptId ||
      request.confirmedExactAttempt !== true ||
      this.now() - review.createdAt > 30 * 60 * 1000
    )
      throw new Error("Governed confirmation missing, stale or mismatched");
    this.governedReviews.delete(request.challenge); // one use, including failures
    const attempt = await reread(request.projectId, request.attemptId);
    if (this.governedBinding(attempt) !== review.binding)
      throw new Error("Governed confirmation evidence changed");
    return create(
      request.projectId,
      request.attemptId,
      session.actorReference,
      localDigest(review.challenge),
    );
  }
  review(cookie: string, revision: ComposedRevision) {
    this.session(cookie);
    // Editing or requesting a new review invalidates previous pending challenges for this draft.
    for (const [id, review] of this.reviews)
      if (
        review.sessionToken === cookie &&
        review.revision.input.preflightDraftId ===
          revision.input.preflightDraftId &&
        !review.result &&
        !review.inFlight
      )
        this.reviews.delete(id);
    const frozen = structuredClone(revision);
    const review: Review = {
      sessionToken: cookie,
      revision: frozen,
      digest: localDigest(canonicalizeComposed(frozen)),
      challenge: token(),
      createdAt: this.now(),
    };
    this.reviews.set(revision.id, review);
    return {
      revision: structuredClone(frozen),
      digest: review.digest,
      challenge: review.challenge,
    };
  }
  pending(cookie: string, revisionId: string) {
    this.session(cookie);
    const review = this.reviews.get(revisionId);
    if (
      !review ||
      review.sessionToken !== cookie ||
      (!review.result && this.now() - review.createdAt > 30 * 60 * 1000)
    )
      throw new Error(
        "Review expired or belongs to another session. Review inputs again.",
      );
    return {
      revision: structuredClone(review.revision),
      digest: review.digest,
      challenge: review.challenge,
    };
  }
  async confirm(
    cookie: string,
    input: {
      revisionId: string;
      challenge: string;
      confirmedWorkInputs: true;
      confirmedRequiredBuckets: true;
    },
    evaluate: (
      revision: ComposedRevision,
      actor: string,
      digest: string,
    ) => Promise<ComposedAttempt>,
  ) {
    const session = this.session(cookie);
    this.pending(cookie, input.revisionId);
    const review = this.reviews.get(input.revisionId)!;
    if (
      !same(input.challenge, review.challenge) ||
      input.confirmedWorkInputs !== true ||
      input.confirmedRequiredBuckets !== true ||
      localDigest(canonicalizeComposed(review.revision)) !== review.digest
    )
      throw new Error("Confirmation mismatch");
    if (review.result) return structuredClone(review.result);
    if (review.inFlight) return review.inFlight;
    // Claim synchronously before awaiting. Concurrent POSTs share one transaction; failures release the claim.
    review.inFlight = evaluate(
      structuredClone(review.revision),
      session.actorReference,
      review.digest,
    )
      .then((result) => {
        review.result = structuredClone(result);
        return result;
      })
      .finally(() => {
        review.inFlight = undefined;
      });
    return review.inFlight;
  }
}
const processState = globalThis as typeof globalThis & {
  capacityGovernorBoundary?: LocalBoundary;
};
export const getLocalBoundary = () =>
  (processState.capacityGovernorBoundary ??= new LocalBoundary());
