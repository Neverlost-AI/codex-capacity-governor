import { afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import {
  createApplicationService,
  createComposedService,
  createGovernedService,
} from "@capacity-governor/application";
import {
  canonicalizeComposed,
  projectSchema,
} from "@capacity-governor/contracts";
import { GATE_A_V1_CONFIGURATION } from "@capacity-governor/policy-engine";
import { GATE_B_V1_CONFIGURATION } from "@capacity-governor/forecast-engine";
import {
  createDatabaseConnection,
  type AppDatabase,
  type DatabaseConnection,
} from "./db/database";
import { createComposedRepository } from "./db/composed-repository";
import { createGovernedRepository } from "./db/governed-repository";
import { createRepositories } from "./db/repositories";
import { hostedConfiguration, ownerKeyFor } from "./hosted-config";
import { HostedBoundary } from "./hosted-boundary";
import { localDigest } from "./local-boundary";
import * as schema from "./db/schema";
import {
  draftFixture,
  DRAFT,
  inputFixture,
  PROJECT,
  TIME,
} from "../../../../packages/application/test/composed-fixture";

const config = {
  origin: "http://127.0.0.1:3101",
  issuer: "https://accounts.google.com",
  subject: "founder-subject",
  sessionKey: "test-key-with-more-than-thirty-two-characters",
  clientId: "local-test-client",
  clientSecret: "",
  testMode: true,
} satisfies ReturnType<typeof hostedConfiguration>;
const founder = ownerKeyFor(config.issuer, config.subject);
let connection: DatabaseConnection | undefined;
let extra: PGlite | undefined;
afterEach(async () => {
  await connection?.close();
  connection = undefined;
  await extra?.close();
  extra = undefined;
});

const setup = async () => {
  connection = await createDatabaseConnection("pglite://memory");
  let clock = Date.parse(TIME);
  const now = () => clock;
  const boundary = new HostedBoundary(connection.db, config, now);
  const cookie = await boundary.admitVerifiedIdentity(
    config.issuer,
    config.subject,
  );
  return {
    db: connection.db,
    boundary,
    cookie,
    setClock: (value: number) => {
      clock = value;
    },
  };
};
const service = (db: AppDatabase, ownerKey = founder) =>
  createComposedService({
    ...createRepositories(db, ownerKey),
    composed: createComposedRepository(db, ownerKey),
    createId: randomUUID,
    now: () => new Date(TIME),
    digest: localDigest,
    forecastConfiguration: GATE_B_V1_CONFIGURATION,
    policyConfiguration: GATE_A_V1_CONFIGURATION,
  });
const seed = async (db: AppDatabase) => {
  const repos = createRepositories(db, founder);
  await repos.projects.create(
    projectSchema.parse({
      id: PROJECT,
      name: "Founder project",
      createdAt: TIME,
      updatedAt: TIME,
    }),
  );
  await repos.preflightDrafts.save(draftFixture());
};

describe("hosted identity, sessions and one-use evidence", () => {
  it("admits only exact verified issuer/subject, persists session state, checks CSRF and revokes", async () => {
    const h = await setup();
    await expect(
      h.boundary.admitVerifiedIdentity(config.issuer, "someone-else"),
    ).rejects.toThrow("allowlisted");
    await expect(
      h.boundary.admitVerifiedIdentity("accounts.google.com", config.subject),
    ).rejects.toThrow("allowlisted");
    const reconnected = new HostedBoundary(h.db, config, () =>
      Date.parse(TIME),
    );
    const session = await reconnected.session(h.cookie);
    expect(session.ownerKey).toBe(founder);
    await expect(
      reconnected.mutation(h.cookie, "browser-trust-flag"),
    ).rejects.toThrow("CSRF");
    await expect(
      reconnected.mutation(h.cookie, session.csrf),
    ).resolves.toMatchObject({ ownerKey: founder });
    await reconnected.end(h.cookie);
    await expect(h.boundary.session(h.cookie)).rejects.toThrow(
      "expired or revoked",
    );
  });

  it("expires idle and absolute sessions and atomically consumes a login state", async () => {
    const h = await setup();
    const login = await h.boundary.createLoginState();
    await expect(
      h.boundary.consumeLoginState(login.state),
    ).resolves.toMatchObject({ nonce: login.nonce });
    await expect(h.boundary.consumeLoginState(login.state)).rejects.toThrow(
      "already used",
    );
    h.setClock(Date.parse(TIME) + 30 * 60_000);
    await expect(h.boundary.session(h.cookie)).rejects.toThrow(
      "expired or revoked",
    );
    const fresh = await h.boundary.createTestSession(
      config.issuer,
      "secondary-test",
    );
    h.setClock(Date.parse(TIME) + 12 * 60 * 60_000);
    await expect(h.boundary.session(fresh)).rejects.toThrow(
      "expired or revoked",
    );
  });

  it("limits outstanding login starts without trusting a supplied IP header", async () => {
    const h = await setup();
    for (let index = 0; index < 20; index++)
      await h.boundary.createLoginState();
    await expect(h.boundary.createLoginState()).rejects.toThrow(
      "temporarily limited",
    );
    h.setClock(Date.parse(TIME) + 10 * 60_000);
    await expect(h.boundary.createLoginState()).resolves.toHaveProperty(
      "state",
    );
  });

  it("binds frozen review to session, digest, exact bucket set and one committed attempt", async () => {
    const h = await setup();
    await seed(h.db);
    const revision = await service(h.db).prepare(inputFixture());
    const review = await h.boundary.review(h.cookie, revision);
    const other = await h.boundary.createTestSession(
      config.issuer,
      "secondary-test",
    );
    await expect(h.boundary.pending(other, revision.id)).rejects.toThrow(
      "another session",
    );
    const pending = await new HostedBoundary(h.db, config, () =>
      Date.parse(TIME),
    ).pending(h.cookie, revision.id);
    expect(pending).toEqual(review);
    const operation = {
      revisionId: revision.id,
      challenge: review.challenge,
      confirmedWorkInputs: true as const,
      confirmedRequiredBuckets: true as const,
    };
    const evaluate = (
      value: typeof revision,
      actor: string,
      digest: string,
      tx?: AppDatabase,
    ) => service(tx ?? h.db).confirm(value, actor, digest);
    await expect(
      h.boundary.confirm(other, operation, evaluate),
    ).rejects.toThrow("mismatch");
    await expect(
      h.boundary.confirm(
        h.cookie,
        { ...operation, challenge: "wrong" },
        evaluate,
      ),
    ).rejects.toThrow("mismatch");
    const [first, duplicate] = await Promise.all([
      h.boundary.confirm(h.cookie, operation, evaluate),
      h.boundary.confirm(h.cookie, operation, evaluate),
    ]);
    expect(duplicate).toEqual(first);
    expect(await h.boundary.confirm(h.cookie, operation, evaluate)).toEqual(
      first,
    );
    expect(await service(h.db).list(PROJECT)).toHaveLength(1);
    const changed = structuredClone(first);
    changed.receipt.buckets[0].resetCycleId = "different-cycle";
    const governed = await h.boundary.reviewGoverned(h.cookie, first);
    let creations = 0;
    const request = {
      projectId: PROJECT,
      attemptId: first.id,
      challenge: governed.challenge,
      confirmedExactAttempt: true as const,
    };
    await expect(
      h.boundary.confirmGoverned(
        h.cookie,
        request,
        async () => changed,
        async () => {
          creations++;
        },
      ),
    ).rejects.toThrow("evidence changed");
    await expect(
      h.boundary.confirmGoverned(
        h.cookie,
        request,
        async () => first,
        async () => {
          creations++;
        },
      ),
    ).rejects.toThrow("used");
    expect(creations).toBe(0);
    const fresh = await h.boundary.reviewGoverned(h.cookie, first);
    const created = await h.boundary.confirmGoverned(
      h.cookie,
      { ...request, challenge: fresh.challenge },
      async () => first,
      async () => {
        creations++;
        return { id: randomUUID() };
      },
    );
    expect(created).toHaveProperty("id");
    expect(creations).toBe(1);
    await expect(
      h.boundary.confirmGoverned(
        h.cookie,
        { ...request, challenge: fresh.challenge },
        async () => first,
        async () => {
          creations++;
        },
      ),
    ).rejects.toThrow("used");
  });

  it("expires an unconfirmed review but allows the exact 30-minute boundary", async () => {
    const h = await setup();
    await seed(h.db);
    const revision = await service(h.db).prepare(inputFixture());
    await h.boundary.review(h.cookie, revision);
    h.setClock(Date.parse(TIME) + 29 * 60_000);
    await h.boundary.session(h.cookie);
    h.setClock(Date.parse(TIME) + 30 * 60_000);
    await expect(
      h.boundary.pending(h.cookie, revision.id),
    ).resolves.toHaveProperty("digest");
    h.setClock(Date.parse(TIME) + 30 * 60_000 + 1);
    await expect(h.boundary.pending(h.cookie, revision.id)).rejects.toThrow();
  });

  it("scopes all repository roots and descendants to the server owner", async () => {
    const h = await setup();
    await seed(h.db);
    const revision = await service(h.db).prepare(inputFixture());
    const attempt = await service(h.db).confirm(
      revision,
      founder,
      localDigest(canonicalizeComposed(revision)),
    );
    const foreign = ownerKeyFor(config.issuer, "other-subject");
    const foreignRepos = createRepositories(h.db, foreign);
    expect(await foreignRepos.projects.findById(PROJECT)).toBeNull();
    expect(await foreignRepos.projects.list()).toEqual([]);
    expect(
      await foreignRepos.preflightDrafts.findByProjectId(PROJECT),
    ).toBeNull();
    expect(
      await foreignRepos.preflightDrafts.findById(draftFixture().id),
    ).toBeNull();
    expect(
      await createComposedRepository(h.db, foreign).find(attempt.id),
    ).toBeNull();
    expect(await createComposedRepository(h.db, foreign).list(PROJECT)).toEqual(
      [],
    );
    expect(
      await createGovernedRepository(h.db, foreign).findByAttempt(attempt.id),
    ).toBeNull();
    await expect(
      foreignRepos.preflightDrafts.save(draftFixture()),
    ).rejects.toThrow("owner");
    const app = createApplicationService({
      ...createRepositories(h.db, founder),
      createId: randomUUID,
      now: () => new Date(TIME),
    });
    const legacyRun = await app.createDevelopmentRun({
      projectId: PROJECT,
      preflightDraftId: DRAFT,
    });
    await app.recordRunOutcome({
      runId: legacyRun.id,
      runOutcome: "PARTIAL",
      validationResult: "INCONCLUSIVE",
      actualConsumption: [],
      unexpectedFailures: ["interrupted"],
      deferredWork: ["finish later"],
    });
    expect(
      await foreignRepos.developmentRuns.findById(legacyRun.id),
    ).toBeNull();
    expect(await foreignRepos.developmentRuns.listByProjectId(PROJECT)).toEqual(
      [],
    );
    expect(
      await foreignRepos.runOutcomes.findLatestByRunId(legacyRun.id),
    ).toBeNull();
    expect(
      await foreignRepos.runOutcomes.listHistoryByRunId(legacyRun.id),
    ).toEqual([]);
    await expect(
      foreignRepos.developmentRuns.create({ ...legacyRun, id: randomUUID() }),
    ).rejects.toThrow("owner");
    const governedApp = createGovernedService({
      ...createRepositories(h.db, founder),
      composed: createComposedRepository(h.db, founder),
      governed: createGovernedRepository(h.db, founder),
      createId: randomUUID,
      now: () => new Date(TIME),
      digest: localDigest,
    });
    const link = await governedApp.create(
      PROJECT,
      attempt.id,
      founder,
      "exact-confirmation",
    );
    const foreignGoverned = createGovernedRepository(h.db, foreign);
    expect(await foreignGoverned.find(link.id)).toBeNull();
    expect(await foreignGoverned.findByAttempt(attempt.id)).toBeNull();
    expect(await foreignGoverned.list(PROJECT)).toEqual([]);
    expect(await foreignGoverned.observations(link.id)).toEqual([]);
    await expect(
      foreignGoverned.create({ ...link, id: randomUUID() }),
    ).rejects.toThrow("owner");
  });

  it("restores a disposable data-directory snapshot with unchanged owner and evidence", async () => {
    const source = await PGlite.create();
    const sourceDb = drizzle(source, { schema });
    await migrate(sourceDb, {
      migrationsFolder: path.resolve("apps/web/drizzle"),
    });
    await seed(sourceDb as unknown as AppDatabase);
    // The disposable export is PGlite-specific; the hosted runbook separately
    // requires pg_dump/pg_restore against an approved Supabase project.
    const dump = await source.dumpDataDir();
    await source.close();
    extra = await PGlite.create({ loadDataDir: dump });
    const restored = drizzle(extra, { schema }) as unknown as AppDatabase;
    expect(
      (await createRepositories(restored, founder).projects.findById(PROJECT))
        ?.name,
    ).toBe("Founder project");
    expect(
      await createRepositories(
        restored,
        ownerKeyFor(config.issuer, "other"),
      ).projects.findById(PROJECT),
    ).toBeNull();
  });
});
