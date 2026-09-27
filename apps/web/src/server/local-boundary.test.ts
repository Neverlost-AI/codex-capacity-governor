import { describe, it, expect } from "vitest";
import {
  LocalBoundary,
  localDigest,
  verifyLocalHeaders,
} from "./local-boundary";
import {
  harness,
  inputFixture,
  digest,
} from "../../../../packages/application/test/composed-fixture";
import { canonicalizeComposed } from "@capacity-governor/contracts";
import { createHmac } from "node:crypto";
const paired = (boundary = new LocalBoundary()) => {
  let secret = "";
  boundary.presentPairingSecret((value) => {
    secret = value;
  });
  const cookie = boundary.pair(secret, boundary.bootstrap());
  return { boundary, cookie, secret };
};
describe("server-held single-operator local boundary", () => {
  it("256-bit runtime pairing, one-use bootstrap, HttpOnly-cookie authority not browser objects", () => {
    const boundary = new LocalBoundary();
    let secret = "";
    boundary.presentPairingSecret((value) => {
      secret = value;
    });
    expect(/^[a-f0-9]{64}$/.test(secret)).toBe(true);
    const bootstrap = boundary.bootstrap();
    expect(() => boundary.pair("wrong", bootstrap)).toThrow("Pairing denied");
    expect(() => boundary.pair(secret, bootstrap)).toThrow("Pairing denied");
    expect(() => boundary.session("browser-session")).toThrow("Paired session");
    expect(() => boundary.session(undefined)).toThrow("Paired session");
    const cookie = boundary.pair(secret, boundary.bootstrap());
    expect(
      boundary.session(cookie).actorReference.startsWith("local-session:"),
    ).toBe(true);
  });
  it("CSRF bound to session, logout and server restart invalidate sessions/challenges", async () => {
    const { boundary, cookie } = paired();
    const other = paired(boundary);
    expect(() =>
      boundary.mutation(cookie, other.boundary.session(other.cookie).csrf),
    ).toThrow("CSRF");
    expect(() => boundary.mutation(cookie, undefined)).toThrow("CSRF");
    expect(
      boundary.mutation(cookie, boundary.session(cookie).csrf),
    ).toBeDefined();
    const h = harness();
    const revision = await h.service.prepare(inputFixture());
    boundary.review(cookie, revision);
    boundary.end(cookie);
    expect(() => boundary.pending(cookie, revision.id)).toThrow(
      "Paired session",
    );
    expect(() => new LocalBoundary().session(other.cookie)).toThrow(
      "Paired session",
    );
  });
  it("review owned by exact session; edited input invalidates prior pending challenge", async () => {
    const { boundary, cookie } = paired();
    const other = paired(boundary);
    const h = harness();
    const revision = await h.service.prepare(inputFixture());
    const review = boundary.review(cookie, revision);
    expect(review.digest).toBe(digest(canonicalizeComposed(revision)));
    expect(() => boundary.pending(other.cookie, revision.id)).toThrow(
      "another session",
    );
    const changed = await h.service.prepare({
      ...inputFixture(),
      brief: "Changed reviewed scope",
    });
    boundary.review(cookie, changed);
    expect(() => boundary.pending(cookie, revision.id)).toThrow("expired");
  });
  it("frozen pending snapshot cannot be changed via returned review object", async () => {
    const { boundary, cookie } = paired();
    const revision = await harness().service.prepare(inputFixture());
    const review = boundary.review(cookie, revision);
    review.revision.input.buckets[0].availableCapacity.amount = "10000";
    expect(
      boundary.pending(cookie, revision.id).revision.input.buckets[0]
        .availableCapacity.amount,
    ).toBe("7800");
  });
  it("challenge/revision/explicit flags fail closed, without browser authority", async () => {
    const { boundary, cookie } = paired();
    const h = harness();
    const revision = await h.service.prepare(inputFixture());
    const review = boundary.review(cookie, revision);
    const operation = {
      revisionId: revision.id,
      challenge: review.challenge,
      confirmedWorkInputs: true as const,
      confirmedRequiredBuckets: true as const,
    };
    const evaluate = (value: typeof revision, actor: string, d: string) =>
      h.service.confirm(value, actor, d);
    await expect(
      boundary.confirm(cookie, { ...operation, challenge: "bad" }, evaluate),
    ).rejects.toThrow("mismatch");
    await expect(
      boundary.confirm(
        cookie,
        { ...operation, revisionId: "00000000-0000-4000-8000-000000000099" },
        evaluate,
      ),
    ).rejects.toThrow("expired");
    await expect(
      boundary.confirm(
        cookie,
        { ...operation, confirmedWorkInputs: false as never },
        evaluate,
      ),
    ).rejects.toThrow("mismatch");
  });
  it("expired bootstrap and pending challenge require fresh review", async () => {
    let clock = 0;
    const boundary = new LocalBoundary(() => clock);
    let secret = "";
    boundary.presentPairingSecret((value) => {
      secret = value;
    });
    const bootstrap = boundary.bootstrap();
    clock = 15 * 60 * 1000 + 1;
    expect(() => boundary.pair(secret, bootstrap)).toThrow("Pairing denied");
    const { cookie } = paired(boundary);
    const revision = await harness().service.prepare(inputFixture());
    boundary.review(cookie, revision);
    clock += 30 * 60 * 1000 + 1;
    expect(() => boundary.pending(cookie, revision.id)).toThrow("expired");
  });
  it("concurrent confirmation claims once; committed retry returns same immutable saved attempt", async () => {
    const { boundary, cookie, secret } = paired();
    const h = harness();
    const revision = await h.service.prepare(inputFixture());
    const review = boundary.review(cookie, revision);
    let calls = 0;
    const evaluate = async (
      value: typeof revision,
      actor: string,
      d: string,
    ) => {
      calls++;
      return h.service.confirm(value, actor, d);
    };
    const operation = {
      revisionId: revision.id,
      challenge: review.challenge,
      confirmedWorkInputs: true as const,
      confirmedRequiredBuckets: true as const,
    };
    const results = await Promise.all([
      boundary.confirm(cookie, operation, evaluate),
      boundary.confirm(cookie, operation, evaluate),
    ]);
    const retry = await boundary.confirm(cookie, operation, evaluate);
    expect(calls).toBe(1);
    expect(results[0].id).toBe(results[1].id);
    expect(retry.id).toBe(results[0].id);
    const evidence = canonicalizeComposed(results[0]);
    expect(
      [secret, cookie, boundary.session(cookie).csrf, review.challenge].some(
        (value) => evidence.includes(value),
      ),
    ).toBe(false);
  });
  it("transaction failure releases claim safely; retry saves once", async () => {
    const { boundary, cookie } = paired();
    const h = harness();
    const revision = await h.service.prepare(inputFixture());
    const review = boundary.review(cookie, revision);
    const operation = {
      revisionId: revision.id,
      challenge: review.challenge,
      confirmedWorkInputs: true as const,
      confirmedRequiredBuckets: true as const,
    };
    const evaluate = (value: typeof revision, actor: string, d: string) =>
      h.service.confirm(value, actor, d);
    h.setFailSave(true);
    await expect(boundary.confirm(cookie, operation, evaluate)).rejects.toThrow(
      "atomic failure",
    );
    expect(h.records.size).toBe(0);
    h.setFailSave(false);
    const saved = await boundary.confirm(cookie, operation, evaluate);
    expect(h.records.size).toBe(1);
    expect(saved.receipt.canonicalDigest).toBe(
      localDigest(canonicalizeComposed(revision)),
    );
  });
  it("request admission proof is startup/request-bound, not equality of framework forwarding", () => {
    const key = "a".repeat(64);
    const previous = process.env.CAPACITY_GOVERNOR_INGRESS_KEY;
    process.env.CAPACITY_GOVERNOR_INGRESS_KEY = key;
    try {
      const context = JSON.stringify([
        "POST",
        "/preflight/confirm",
        "127.0.0.1:3100",
        "http://127.0.0.1:3100",
        "request-nonce",
      ]);
      const headers = new Headers({
        host: "127.0.0.1:3100",
        origin: "http://127.0.0.1:3100",
        "x-forwarded-host": "127.0.0.1:3100",
        "x-cg-ingress-context": Buffer.from(context).toString("base64url"),
        "x-cg-ingress-proof": createHmac("sha256", key)
          .update(context)
          .digest("hex"),
      });
      expect(() =>
        verifyLocalHeaders(headers, true, "http://127.0.0.1:3100"),
      ).not.toThrow();
      headers.set("origin", "http://attacker.invalid");
      expect(() =>
        verifyLocalHeaders(headers, true, "http://127.0.0.1:3100"),
      ).toThrow();
      headers.set("origin", "http://127.0.0.1:3100");
      process.env.CAPACITY_GOVERNOR_INGRESS_KEY = "b".repeat(64);
      expect(() =>
        verifyLocalHeaders(headers, true, "http://127.0.0.1:3100"),
      ).toThrow();
      headers.delete("x-cg-ingress-proof");
      expect(() =>
        verifyLocalHeaders(headers, false, "http://127.0.0.1:3100"),
      ).toThrow("ingress");
    } finally {
      if (previous === undefined)
        delete process.env.CAPACITY_GOVERNOR_INGRESS_KEY;
      else process.env.CAPACITY_GOVERNOR_INGRESS_KEY = previous;
    }
  });
});
