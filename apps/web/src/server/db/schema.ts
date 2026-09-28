import { sql } from "drizzle-orm";
import type {
  ComposedAttempt,
  ComposedRevision,
  GovernedLink,
  GovernedObservation,
} from "@capacity-governor/contracts";
import {
  type AnyPgColumn,
  check,
  doublePrecision,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const preflightDrafts = pgTable(
  "preflight_drafts",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    trancheId: uuid("tranche_id").notNull(),
    trancheTitle: text("tranche_title").notNull(),
    trancheBrief: text("tranche_brief").notNull(),
    explicitExclusions: jsonb("explicit_exclusions")
      .$type<string[]>()
      .notNull(),
    acceptanceCriteria: jsonb("acceptance_criteria")
      .$type<string[]>()
      .notNull(),
    availableBudgetAmount: doublePrecision("available_budget_amount").notNull(),
    availableBudgetUnit: text("available_budget_unit").notNull(),
    availableBudgetSource: text("available_budget_source").notNull(),
    resetAt: timestamp("reset_at", { withTimezone: true }),
    resetTimezone: text("reset_timezone").notNull(),
    resetNotes: text("reset_notes"),
    correctionMinimumAmount: doublePrecision("correction_minimum_amount"),
    correctionMinimumUnit: text("correction_minimum_unit"),
    correctionTargetShare: doublePrecision("correction_target_share"),
    validationMinimumAmount: doublePrecision("validation_minimum_amount"),
    validationMinimumUnit: text("validation_minimum_unit"),
    validationTargetShare: doublePrecision("validation_target_share"),
    assumptions: jsonb("assumptions").$type<string[]>().notNull(),
    openQuestions: jsonb("open_questions").$type<string[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("preflight_drafts_project_id_unique").on(table.projectId),
    check(
      "preflight_budget_nonnegative",
      sql`${table.availableBudgetAmount} >= 0`,
    ),
    check(
      "preflight_correction_minimum_pair",
      sql`(${table.correctionMinimumAmount} is null) = (${table.correctionMinimumUnit} is null)`,
    ),
    check(
      "preflight_validation_minimum_pair",
      sql`(${table.validationMinimumAmount} is null) = (${table.validationMinimumUnit} is null)`,
    ),
    check(
      "preflight_correction_minimum_nonnegative",
      sql`${table.correctionMinimumAmount} is null or ${table.correctionMinimumAmount} >= 0`,
    ),
    check(
      "preflight_validation_minimum_nonnegative",
      sql`${table.validationMinimumAmount} is null or ${table.validationMinimumAmount} >= 0`,
    ),
    check(
      "preflight_correction_share_range",
      sql`${table.correctionTargetShare} is null or ${table.correctionTargetShare} between 0 and 1`,
    ),
    check(
      "preflight_validation_share_range",
      sql`${table.validationTargetShare} is null or ${table.validationTargetShare} between 0 and 1`,
    ),
    check(
      "preflight_manual_source",
      sql`${table.availableBudgetSource} = 'manual'`,
    ),
  ],
);

export const developmentRuns = pgTable(
  "development_runs",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    preflightDraftId: uuid("preflight_draft_id")
      .notNull()
      .references(() => preflightDrafts.id, { onDelete: "cascade" }),
    guidanceKind: text("guidance_kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check(
      "development_runs_unguided_only",
      sql`${table.guidanceKind} = 'UNGUIDED'`,
    ),
    index("development_runs_project_created_at_idx").on(
      table.projectId,
      table.createdAt,
    ),
  ],
);

export const runOutcomeObservations = pgTable(
  "run_outcome_observations",
  {
    id: uuid("id").primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => developmentRuns.id, { onDelete: "cascade" }),
    supersedesObservationId: uuid("supersedes_observation_id").references(
      (): AnyPgColumn => runOutcomeObservations.id,
      { onDelete: "restrict" },
    ),
    runOutcome: text("run_outcome").notNull(),
    validationResult: text("validation_result").notNull(),
    unexpectedFailures: jsonb("unexpected_failures")
      .$type<string[]>()
      .notNull(),
    deferredWork: jsonb("deferred_work").$type<string[]>().notNull(),
    notes: text("notes"),
    remainingCapacityAmount: doublePrecision("remaining_capacity_amount"),
    remainingCapacityUnit: text("remaining_capacity_unit"),
    remainingCapacityObservedAt: timestamp("remaining_capacity_observed_at", {
      withTimezone: true,
    }),
    remainingCapacitySource: text("remaining_capacity_source"),
    amendmentReason: text("amendment_reason"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("run_outcome_observations_one_initial_per_run")
      .on(table.runId)
      .where(sql`${table.supersedesObservationId} is null`),
    uniqueIndex("run_outcome_observations_one_successor")
      .on(table.supersedesObservationId)
      .where(sql`${table.supersedesObservationId} is not null`),
    index("run_outcome_observations_run_recorded_at_idx").on(
      table.runId,
      table.recordedAt,
    ),
    check(
      "run_outcome_observations_run_outcome",
      sql`${table.runOutcome} in ('COMPLETED', 'PARTIAL', 'FAILED')`,
    ),
    check(
      "run_outcome_observations_validation_result",
      sql`${table.validationResult} in ('NOT_RUN', 'PASSED', 'PARTIAL', 'FAILED', 'INCONCLUSIVE')`,
    ),
    check(
      "run_outcome_observations_remaining_all_or_none",
      sql`(
        ${table.remainingCapacityAmount} is null
        and ${table.remainingCapacityUnit} is null
        and ${table.remainingCapacityObservedAt} is null
        and ${table.remainingCapacitySource} is null
      ) or (
        ${table.remainingCapacityAmount} is not null
        and ${table.remainingCapacityUnit} is not null
        and ${table.remainingCapacityObservedAt} is not null
        and ${table.remainingCapacitySource} is not null
      )`,
    ),
    check(
      "run_outcome_observations_remaining_nonnegative",
      sql`${table.remainingCapacityAmount} is null or ${table.remainingCapacityAmount} >= 0`,
    ),
    check(
      "run_outcome_observations_remaining_finite",
      sql`${table.remainingCapacityAmount} is null or ${table.remainingCapacityAmount} not in ('Infinity'::float8, '-Infinity'::float8, 'NaN'::float8)`,
    ),
    check(
      "run_outcome_observations_remaining_unit_nonempty",
      sql`${table.remainingCapacityUnit} is null or btrim(${table.remainingCapacityUnit}) <> ''`,
    ),
    check(
      "run_outcome_observations_remaining_manual",
      sql`${table.remainingCapacitySource} is null or ${table.remainingCapacitySource} = 'manual'`,
    ),
    check(
      "run_outcome_observations_amendment_pair",
      sql`(${table.supersedesObservationId} is null) = (${table.amendmentReason} is null)`,
    ),
    check(
      "run_outcome_observations_amendment_reason_nonempty",
      sql`${table.amendmentReason} is null or btrim(${table.amendmentReason}) <> ''`,
    ),
  ],
);

export const actualCapacityConsumptions = pgTable(
  "actual_capacity_consumptions",
  {
    id: uuid("id").primaryKey(),
    outcomeObservationId: uuid("outcome_observation_id")
      .notNull()
      .references(() => runOutcomeObservations.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    amount: doublePrecision("amount").notNull(),
    unit: text("unit").notNull(),
    source: text("source").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("actual_capacity_consumptions_observation_category_unique").on(
      table.outcomeObservationId,
      table.category,
    ),
    check(
      "actual_capacity_consumptions_category",
      sql`${table.category} in ('IMPLEMENTATION', 'CORRECTION', 'VALIDATION', 'OTHER')`,
    ),
    check(
      "actual_capacity_consumptions_nonnegative",
      sql`${table.amount} >= 0`,
    ),
    check(
      "actual_capacity_consumptions_finite",
      sql`${table.amount} not in ('Infinity'::float8, '-Infinity'::float8, 'NaN'::float8)`,
    ),
    check(
      "actual_capacity_consumptions_unit_nonempty",
      sql`btrim(${table.unit}) <> ''`,
    ),
    check(
      "actual_capacity_consumptions_manual",
      sql`${table.source} = 'manual'`,
    ),
  ],
);

export const composedPreflightRevisions = pgTable(
  "composed_preflight_revisions",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "restrict" }),
    preflightDraftId: uuid("preflight_draft_id")
      .notNull()
      .references(() => preflightDrafts.id, { onDelete: "restrict" }),
    canonicalDigest: text("canonical_digest").notNull(),
    snapshot: jsonb("snapshot").$type<ComposedRevision>().notNull(),
  },
);
export const preflightEvaluationAttempts = pgTable(
  "preflight_evaluation_attempts",
  {
    id: uuid("id").primaryKey(),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => composedPreflightRevisions.id, {
        onDelete: "restrict",
      }),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    snapshot: jsonb("snapshot").$type<ComposedAttempt>().notNull(),
  },
  (table) => [
    uniqueIndex("preflight_attempts_revision_unique").on(table.revisionId),
  ],
);

// T006 is additive: neither the UNGUIDED table nor its check constraint changes.
export const governedRuns = pgTable(
  "governed_runs",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "restrict" }),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => preflightEvaluationAttempts.id, {
        onDelete: "restrict",
      }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }).notNull(),
    snapshot: jsonb("snapshot").$type<GovernedLink>().notNull(),
  },
  (table) => [
    uniqueIndex("governed_runs_attempt_unique").on(table.attemptId),
    index("governed_runs_project_confirmed_idx").on(
      table.projectId,
      table.confirmedAt,
    ),
  ],
);

export const governedOutcomeVersions = pgTable(
  "governed_outcome_versions",
  {
    id: uuid("id").primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => governedRuns.id, { onDelete: "restrict" }),
    predecessorId: uuid("predecessor_id").references(
      (): AnyPgColumn => governedOutcomeVersions.id,
      { onDelete: "restrict" },
    ),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    snapshot: jsonb("snapshot").$type<GovernedObservation>().notNull(),
  },
  (table) => [
    uniqueIndex("governed_outcomes_one_initial")
      .on(table.runId)
      .where(sql`${table.predecessorId} is null`),
    uniqueIndex("governed_outcomes_one_successor")
      .on(table.predecessorId)
      .where(sql`${table.predecessorId} is not null`),
    index("governed_outcomes_run_recorded_idx").on(
      table.runId,
      table.recordedAt,
    ),
  ],
);

export const governedBucketUsage = pgTable(
  "governed_bucket_usage",
  {
    id: uuid("id").primaryKey(),
    outcomeId: uuid("outcome_id")
      .notNull()
      .references(() => governedOutcomeVersions.id, { onDelete: "restrict" }),
    bucketId: text("bucket_id").notNull(),
    providerId: text("provider_id").notNull(),
    capacityWindowId: text("capacity_window_id").notNull(),
    resetCycleId: text("reset_cycle_id").notNull(),
    category: text("category").notNull(),
    rawValue: text("raw_value").notNull(),
    rawUnit: text("raw_unit").notNull(),
    normalizedBasisPoints: text("normalized_basis_points").notNull(),
  },
  (table) => [
    uniqueIndex("governed_usage_exact_bucket_category_unique").on(
      table.outcomeId,
      table.bucketId,
      table.providerId,
      table.capacityWindowId,
      table.resetCycleId,
      table.category,
    ),
    check(
      "governed_usage_category",
      sql`${table.category} in ('IMPLEMENTATION', 'CORRECTION', 'VALIDATION')`,
    ),
    check(
      "governed_usage_unit",
      sql`${table.rawUnit} in ('PERCENT', 'BASIS_POINTS')`,
    ),
  ],
);
