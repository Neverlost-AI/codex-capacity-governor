import { sql } from "drizzle-orm";
import {
  check,
  doublePrecision,
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
