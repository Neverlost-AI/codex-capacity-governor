CREATE TABLE "actual_capacity_consumptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"outcome_observation_id" uuid NOT NULL,
	"category" text NOT NULL,
	"amount" double precision NOT NULL,
	"unit" text NOT NULL,
	"source" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	CONSTRAINT "actual_capacity_consumptions_category" CHECK ("actual_capacity_consumptions"."category" in ('IMPLEMENTATION', 'CORRECTION', 'VALIDATION', 'OTHER')),
	CONSTRAINT "actual_capacity_consumptions_nonnegative" CHECK ("actual_capacity_consumptions"."amount" >= 0),
	CONSTRAINT "actual_capacity_consumptions_finite" CHECK ("actual_capacity_consumptions"."amount" not in ('Infinity'::float8, '-Infinity'::float8, 'NaN'::float8)),
	CONSTRAINT "actual_capacity_consumptions_unit_nonempty" CHECK (btrim("actual_capacity_consumptions"."unit") <> ''),
	CONSTRAINT "actual_capacity_consumptions_manual" CHECK ("actual_capacity_consumptions"."source" = 'manual')
);
--> statement-breakpoint
CREATE TABLE "development_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"preflight_draft_id" uuid NOT NULL,
	"guidance_kind" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "development_runs_unguided_only" CHECK ("development_runs"."guidance_kind" = 'UNGUIDED')
);
--> statement-breakpoint
CREATE TABLE "run_outcome_observations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"run_id" uuid NOT NULL,
	"supersedes_observation_id" uuid,
	"run_outcome" text NOT NULL,
	"validation_result" text NOT NULL,
	"unexpected_failures" jsonb NOT NULL,
	"deferred_work" jsonb NOT NULL,
	"notes" text,
	"remaining_capacity_amount" double precision,
	"remaining_capacity_unit" text,
	"remaining_capacity_observed_at" timestamp with time zone,
	"remaining_capacity_source" text,
	"amendment_reason" text,
	"recorded_at" timestamp with time zone NOT NULL,
	CONSTRAINT "run_outcome_observations_run_outcome" CHECK ("run_outcome_observations"."run_outcome" in ('COMPLETED', 'PARTIAL', 'FAILED')),
	CONSTRAINT "run_outcome_observations_validation_result" CHECK ("run_outcome_observations"."validation_result" in ('NOT_RUN', 'PASSED', 'PARTIAL', 'FAILED', 'INCONCLUSIVE')),
	CONSTRAINT "run_outcome_observations_remaining_all_or_none" CHECK ((
        "run_outcome_observations"."remaining_capacity_amount" is null
        and "run_outcome_observations"."remaining_capacity_unit" is null
        and "run_outcome_observations"."remaining_capacity_observed_at" is null
        and "run_outcome_observations"."remaining_capacity_source" is null
      ) or (
        "run_outcome_observations"."remaining_capacity_amount" is not null
        and "run_outcome_observations"."remaining_capacity_unit" is not null
        and "run_outcome_observations"."remaining_capacity_observed_at" is not null
        and "run_outcome_observations"."remaining_capacity_source" is not null
      )),
	CONSTRAINT "run_outcome_observations_remaining_nonnegative" CHECK ("run_outcome_observations"."remaining_capacity_amount" is null or "run_outcome_observations"."remaining_capacity_amount" >= 0),
	CONSTRAINT "run_outcome_observations_remaining_finite" CHECK ("run_outcome_observations"."remaining_capacity_amount" is null or "run_outcome_observations"."remaining_capacity_amount" not in ('Infinity'::float8, '-Infinity'::float8, 'NaN'::float8)),
	CONSTRAINT "run_outcome_observations_remaining_unit_nonempty" CHECK ("run_outcome_observations"."remaining_capacity_unit" is null or btrim("run_outcome_observations"."remaining_capacity_unit") <> ''),
	CONSTRAINT "run_outcome_observations_remaining_manual" CHECK ("run_outcome_observations"."remaining_capacity_source" is null or "run_outcome_observations"."remaining_capacity_source" = 'manual'),
	CONSTRAINT "run_outcome_observations_amendment_pair" CHECK (("run_outcome_observations"."supersedes_observation_id" is null) = ("run_outcome_observations"."amendment_reason" is null)),
	CONSTRAINT "run_outcome_observations_amendment_reason_nonempty" CHECK ("run_outcome_observations"."amendment_reason" is null or btrim("run_outcome_observations"."amendment_reason") <> '')
);
--> statement-breakpoint
ALTER TABLE "actual_capacity_consumptions" ADD CONSTRAINT "actual_capacity_consumptions_outcome_observation_id_run_outcome_observations_id_fk" FOREIGN KEY ("outcome_observation_id") REFERENCES "public"."run_outcome_observations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development_runs" ADD CONSTRAINT "development_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development_runs" ADD CONSTRAINT "development_runs_preflight_draft_id_preflight_drafts_id_fk" FOREIGN KEY ("preflight_draft_id") REFERENCES "public"."preflight_drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_outcome_observations" ADD CONSTRAINT "run_outcome_observations_run_id_development_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."development_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_outcome_observations" ADD CONSTRAINT "run_outcome_observations_supersedes_observation_id_run_outcome_observations_id_fk" FOREIGN KEY ("supersedes_observation_id") REFERENCES "public"."run_outcome_observations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "actual_capacity_consumptions_observation_category_unique" ON "actual_capacity_consumptions" USING btree ("outcome_observation_id","category");--> statement-breakpoint
CREATE INDEX "development_runs_project_created_at_idx" ON "development_runs" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "run_outcome_observations_one_initial_per_run" ON "run_outcome_observations" USING btree ("run_id") WHERE "run_outcome_observations"."supersedes_observation_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "run_outcome_observations_one_successor" ON "run_outcome_observations" USING btree ("supersedes_observation_id") WHERE "run_outcome_observations"."supersedes_observation_id" is not null;--> statement-breakpoint
CREATE INDEX "run_outcome_observations_run_recorded_at_idx" ON "run_outcome_observations" USING btree ("run_id","recorded_at");