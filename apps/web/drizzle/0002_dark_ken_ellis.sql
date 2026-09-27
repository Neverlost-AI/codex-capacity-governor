CREATE TABLE "composed_preflight_revisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"preflight_draft_id" uuid NOT NULL,
	"canonical_digest" text NOT NULL,
	"snapshot" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preflight_evaluation_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"revision_id" uuid NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"snapshot" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "composed_preflight_revisions" ADD CONSTRAINT "composed_preflight_revisions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "composed_preflight_revisions" ADD CONSTRAINT "composed_preflight_revisions_preflight_draft_id_preflight_drafts_id_fk" FOREIGN KEY ("preflight_draft_id") REFERENCES "public"."preflight_drafts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preflight_evaluation_attempts" ADD CONSTRAINT "preflight_evaluation_attempts_revision_id_composed_preflight_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."composed_preflight_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "preflight_attempts_revision_unique" ON "preflight_evaluation_attempts" USING btree ("revision_id");