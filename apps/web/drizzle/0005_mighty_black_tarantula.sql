ALTER TABLE "composed_preflight_revisions" ALTER COLUMN "preflight_draft_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "hosted_preflight_reviews" ALTER COLUMN "draft_id" DROP NOT NULL;