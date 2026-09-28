CREATE TABLE "governed_bucket_usage" (
	"id" uuid PRIMARY KEY NOT NULL,
	"outcome_id" uuid NOT NULL,
	"bucket_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"capacity_window_id" text NOT NULL,
	"reset_cycle_id" text NOT NULL,
	"category" text NOT NULL,
	"raw_value" text NOT NULL,
	"raw_unit" text NOT NULL,
	"normalized_basis_points" text NOT NULL,
	CONSTRAINT "governed_usage_category" CHECK ("governed_bucket_usage"."category" in ('IMPLEMENTATION', 'CORRECTION', 'VALIDATION')),
	CONSTRAINT "governed_usage_unit" CHECK ("governed_bucket_usage"."raw_unit" in ('PERCENT', 'BASIS_POINTS'))
);
--> statement-breakpoint
CREATE TABLE "governed_outcome_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"run_id" uuid NOT NULL,
	"predecessor_id" uuid,
	"recorded_at" timestamp with time zone NOT NULL,
	"snapshot" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "governed_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"attempt_id" uuid NOT NULL,
	"confirmed_at" timestamp with time zone NOT NULL,
	"snapshot" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "governed_bucket_usage" ADD CONSTRAINT "governed_bucket_usage_outcome_id_governed_outcome_versions_id_fk" FOREIGN KEY ("outcome_id") REFERENCES "public"."governed_outcome_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "governed_outcome_versions" ADD CONSTRAINT "governed_outcome_versions_run_id_governed_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."governed_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "governed_outcome_versions" ADD CONSTRAINT "governed_outcome_versions_predecessor_id_governed_outcome_versions_id_fk" FOREIGN KEY ("predecessor_id") REFERENCES "public"."governed_outcome_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "governed_runs" ADD CONSTRAINT "governed_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "governed_runs" ADD CONSTRAINT "governed_runs_attempt_id_preflight_evaluation_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."preflight_evaluation_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "governed_usage_exact_bucket_category_unique" ON "governed_bucket_usage" USING btree ("outcome_id","bucket_id","provider_id","capacity_window_id","reset_cycle_id","category");--> statement-breakpoint
CREATE UNIQUE INDEX "governed_outcomes_one_initial" ON "governed_outcome_versions" USING btree ("run_id") WHERE "governed_outcome_versions"."predecessor_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "governed_outcomes_one_successor" ON "governed_outcome_versions" USING btree ("predecessor_id") WHERE "governed_outcome_versions"."predecessor_id" is not null;--> statement-breakpoint
CREATE INDEX "governed_outcomes_run_recorded_idx" ON "governed_outcome_versions" USING btree ("run_id","recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "governed_runs_attempt_unique" ON "governed_runs" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "governed_runs_project_confirmed_idx" ON "governed_runs" USING btree ("project_id","confirmed_at");