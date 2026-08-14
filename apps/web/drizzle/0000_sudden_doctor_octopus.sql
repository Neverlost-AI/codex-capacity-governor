CREATE TABLE "preflight_drafts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"tranche_id" uuid NOT NULL,
	"tranche_title" text NOT NULL,
	"tranche_brief" text NOT NULL,
	"explicit_exclusions" jsonb NOT NULL,
	"acceptance_criteria" jsonb NOT NULL,
	"available_budget_amount" double precision NOT NULL,
	"available_budget_unit" text NOT NULL,
	"available_budget_source" text NOT NULL,
	"reset_at" timestamp with time zone,
	"reset_timezone" text NOT NULL,
	"reset_notes" text,
	"correction_minimum_amount" double precision,
	"correction_minimum_unit" text,
	"correction_target_share" double precision,
	"validation_minimum_amount" double precision,
	"validation_minimum_unit" text,
	"validation_target_share" double precision,
	"assumptions" jsonb NOT NULL,
	"open_questions" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "preflight_budget_nonnegative" CHECK ("preflight_drafts"."available_budget_amount" >= 0),
	CONSTRAINT "preflight_correction_minimum_pair" CHECK (("preflight_drafts"."correction_minimum_amount" is null) = ("preflight_drafts"."correction_minimum_unit" is null)),
	CONSTRAINT "preflight_validation_minimum_pair" CHECK (("preflight_drafts"."validation_minimum_amount" is null) = ("preflight_drafts"."validation_minimum_unit" is null)),
	CONSTRAINT "preflight_correction_minimum_nonnegative" CHECK ("preflight_drafts"."correction_minimum_amount" is null or "preflight_drafts"."correction_minimum_amount" >= 0),
	CONSTRAINT "preflight_validation_minimum_nonnegative" CHECK ("preflight_drafts"."validation_minimum_amount" is null or "preflight_drafts"."validation_minimum_amount" >= 0),
	CONSTRAINT "preflight_correction_share_range" CHECK ("preflight_drafts"."correction_target_share" is null or "preflight_drafts"."correction_target_share" between 0 and 1),
	CONSTRAINT "preflight_validation_share_range" CHECK ("preflight_drafts"."validation_target_share" is null or "preflight_drafts"."validation_target_share" between 0 and 1),
	CONSTRAINT "preflight_manual_source" CHECK ("preflight_drafts"."available_budget_source" = 'manual')
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "preflight_drafts" ADD CONSTRAINT "preflight_drafts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "preflight_drafts_project_id_unique" ON "preflight_drafts" USING btree ("project_id");