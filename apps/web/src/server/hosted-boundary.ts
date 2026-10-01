import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  canonicalizeComposed,
  composedAttemptSchema,
  type ComposedAttempt,
  type ComposedRevision,
} from "@capacity-governor/contracts";
import { and, eq, gt, gte, isNull, sql } from "drizzle-orm";
import type { AppDatabase } from "./db/database";
import {
  hostedGovernedReviews,
  hostedLoginStates,
  hostedPreflightReviews,
  hostedSessions,
} from "./db/schema";
import { type HostedConfiguration, ownerKeyFor } from "./hosted-config";
import { localDigest } from "./local-boundary";

const randomToken = () => randomBytes(32).toString("base64url");
const equal = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const minute = 60_000;
const idleLifetime = 30 * minute;
const absoluteLifetime = 12 * 60 * minute;
const reviewLifetime = 30 * minute;
const loginLifetime = 10 * minute;

export type HostedSession = {
  actorReference: string;
  ownerKey: string;
  csrf: string;
};

export class HostedBoundary {
  constructor(
    private readonly db: AppDatabase,
    private readonly configuration: HostedConfiguration,
    private readonly now: () => number = Date.now,
  ) {}

  private hash(value: string) {
    return createHmac("sha256", this.configuration.sessionKey)
      .update(value)
      .digest("hex");
  }

  private csrf(cookie: string) {
    return this.hash(`csrf:${cookie}`);
  }

  async createLoginState() {
    // Small founder-only service: cap active login starts globally without
    // trusting a caller-supplied IP header as an identity. Platform throttling
    // remains an additional live deployment check.
    const [active] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(hostedLoginStates)
      .where(gt(hostedLoginStates.expiresAt, new Date(this.now())));
    if (active.count >= 20) throw new Error("Login start temporarily limited");
    const state = randomToken();
    const nonce = randomToken();
    const verifier = randomToken();
    await this.db.insert(hostedLoginStates).values({
      stateHash: this.hash(state),
      nonce,
      codeVerifier: verifier,
      expiresAt: new Date(this.now() + loginLifetime),
    });
    return { state, nonce, verifier };
  }

  async consumeLoginState(state: string) {
    const [row] = await this.db
      .update(hostedLoginStates)
      .set({ consumedAt: new Date(this.now()) })
      .where(
        and(
          eq(hostedLoginStates.stateHash, this.hash(state)),
          isNull(hostedLoginStates.consumedAt),
          gt(hostedLoginStates.expiresAt, new Date(this.now())),
        ),
      )
      .returning();
    if (!row) throw new Error("Login state expired or already used");
    return { nonce: row.nonce, verifier: row.codeVerifier };
  }

  async admitVerifiedIdentity(issuer: string, subject: string) {
    if (
      issuer !== this.configuration.issuer ||
      subject !== this.configuration.subject
    )
      throw new Error("Identity is not founder-allowlisted");
    return this.createSession(issuer, subject);
  }

  // Only local test harnesses use a second principal; production sign-in calls
  // admitVerifiedIdentity and cannot admit it.
  async createTestSession(issuer: string, subject: string) {
    if (!this.configuration.testMode) throw new Error("Test identity disabled");
    return this.createSession(issuer, subject);
  }

  private async createSession(issuer: string, subject: string) {
    const cookie = randomToken();
    const ownerKey = ownerKeyFor(issuer, subject);
    const now = new Date(this.now());
    await this.db.insert(hostedSessions).values({
      tokenHash: this.hash(cookie),
      ownerKey,
      actorReference: ownerKey,
      issuedAt: now,
      lastSeenAt: now,
      expiresAt: new Date(this.now() + absoluteLifetime),
    });
    return cookie;
  }

  async session(cookie: string | undefined): Promise<HostedSession> {
    if (!cookie) throw new Error("Hosted session required");
    const now = new Date(this.now());
    const [row] = await this.db
      .update(hostedSessions)
      .set({ lastSeenAt: now })
      .where(
        and(
          eq(hostedSessions.tokenHash, this.hash(cookie)),
          isNull(hostedSessions.revokedAt),
          gt(hostedSessions.expiresAt, now),
          gt(hostedSessions.lastSeenAt, new Date(this.now() - idleLifetime)),
        ),
      )
      .returning();
    if (!row) throw new Error("Hosted session expired or revoked");
    return {
      actorReference: row.actorReference,
      ownerKey: row.ownerKey,
      csrf: this.csrf(cookie),
    };
  }

  async mutation(cookie: string | undefined, csrf: unknown) {
    const session = await this.session(cookie);
    if (typeof csrf !== "string" || !equal(csrf, session.csrf))
      throw new Error("Hosted session CSRF evidence required");
    return session;
  }

  async end(cookie: string) {
    const tokenHash = this.hash(cookie);
    await this.db
      .update(hostedSessions)
      .set({ revokedAt: new Date(this.now()) })
      .where(eq(hostedSessions.tokenHash, tokenHash));
    await this.db
      .delete(hostedPreflightReviews)
      .where(eq(hostedPreflightReviews.sessionHash, tokenHash));
    await this.db
      .delete(hostedGovernedReviews)
      .where(eq(hostedGovernedReviews.sessionHash, tokenHash));
  }

  private reviewChallenge(cookie: string, revisionId: string) {
    return this.hash(`review:${cookie}:${revisionId}`);
  }

  async review(cookie: string, revision: ComposedRevision) {
    const session = await this.session(cookie);
    const sessionHash = this.hash(cookie);
    const frozen = structuredClone(revision);
    const challenge = this.reviewChallenge(cookie, revision.id);
    const digest = localDigest(canonicalizeComposed(frozen));
    await this.db.transaction(async (tx) => {
      await tx
        .delete(hostedPreflightReviews)
        .where(
          and(
            eq(hostedPreflightReviews.sessionHash, sessionHash),
            eq(hostedPreflightReviews.projectId, revision.input.projectId),
            isNull(hostedPreflightReviews.result),
          ),
        );
      await tx.insert(hostedPreflightReviews).values({
        revisionId: revision.id,
        ownerKey: session.ownerKey,
        sessionHash,
        projectId: revision.input.projectId,
        draftId: revision.input.preflightDraftId ?? null,
        snapshot: frozen,
        digest,
        challengeHash: this.hash(challenge),
        createdAt: new Date(this.now()),
      });
    });
    return { revision: structuredClone(frozen), digest, challenge };
  }

  async pending(cookie: string, revisionId: string) {
    const session = await this.session(cookie);
    const [row] = await this.db
      .select()
      .from(hostedPreflightReviews)
      .where(
        and(
          eq(hostedPreflightReviews.revisionId, revisionId),
          eq(hostedPreflightReviews.sessionHash, this.hash(cookie)),
          eq(hostedPreflightReviews.ownerKey, session.ownerKey),
        ),
      );
    if (
      !row ||
      (!row.result && this.now() - row.createdAt.getTime() > reviewLifetime)
    )
      throw new Error("Review expired or belongs to another session");
    return {
      revision: structuredClone(row.snapshot),
      digest: row.digest,
      challenge: this.reviewChallenge(cookie, revisionId),
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
      transaction?: AppDatabase,
    ) => Promise<ComposedAttempt>,
  ) {
    const session = await this.session(cookie);
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(hostedPreflightReviews)
        .where(eq(hostedPreflightReviews.revisionId, input.revisionId))
        .for("update");
      if (
        !row ||
        row.sessionHash !== this.hash(cookie) ||
        row.ownerKey !== session.ownerKey ||
        !equal(this.hash(input.challenge), row.challengeHash) ||
        input.confirmedWorkInputs !== true ||
        input.confirmedRequiredBuckets !== true ||
        localDigest(canonicalizeComposed(row.snapshot)) !== row.digest ||
        (!row.result && this.now() - row.createdAt.getTime() > reviewLifetime)
      )
        throw new Error("Exact preflight confirmation mismatch");
      if (row.result) return composedAttemptSchema.parse(row.result);
      const result = await evaluate(
        structuredClone(row.snapshot),
        session.actorReference,
        row.digest,
        tx as AppDatabase,
      );
      await tx
        .update(hostedPreflightReviews)
        .set({ result })
        .where(eq(hostedPreflightReviews.revisionId, input.revisionId));
      return result;
    });
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
          .sort((a, b) => {
            const left = JSON.stringify(a);
            const right = JSON.stringify(b);
            return left < right ? -1 : left > right ? 1 : 0;
          }),
      }),
    );
  }

  async reviewGoverned(cookie: string, attempt: ComposedAttempt) {
    const session = await this.session(cookie);
    const challenge = randomToken();
    await this.db.insert(hostedGovernedReviews).values({
      challengeHash: this.hash(challenge),
      ownerKey: session.ownerKey,
      sessionHash: this.hash(cookie),
      projectId: attempt.revision.input.projectId,
      attemptId: attempt.id,
      binding: this.governedBinding(attempt),
      createdAt: new Date(this.now()),
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
    const session = await this.session(cookie);
    if (request.confirmedExactAttempt !== true)
      throw new Error("Explicit governed confirmation required");
    // The conditional UPDATE is the one-use claim across processes. Even a
    // failed save burns this challenge, matching the accepted local behavior.
    const [review] = await this.db
      .update(hostedGovernedReviews)
      .set({ consumedAt: new Date(this.now()) })
      .where(
        and(
          eq(hostedGovernedReviews.challengeHash, this.hash(request.challenge)),
          eq(hostedGovernedReviews.ownerKey, session.ownerKey),
          eq(hostedGovernedReviews.sessionHash, this.hash(cookie)),
          eq(hostedGovernedReviews.projectId, request.projectId),
          eq(hostedGovernedReviews.attemptId, request.attemptId),
          isNull(hostedGovernedReviews.consumedAt),
          gte(
            hostedGovernedReviews.createdAt,
            new Date(this.now() - reviewLifetime),
          ),
        ),
      )
      .returning();
    if (!review)
      throw new Error("Governed confirmation missing, stale or used");
    const attempt = await reread(request.projectId, request.attemptId);
    if (this.governedBinding(attempt) !== review.binding)
      throw new Error("Governed confirmation evidence changed");
    return create(
      request.projectId,
      request.attemptId,
      session.actorReference,
      localDigest(request.challenge),
    );
  }
}
