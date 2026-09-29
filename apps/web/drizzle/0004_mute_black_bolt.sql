CREATE TABLE "hosted_governed_reviews" (
	"challenge_hash" text PRIMARY KEY NOT NULL,
	"owner_key" text NOT NULL,
	"session_hash" text NOT NULL,
	"project_id" uuid NOT NULL,
	"attempt_id" uuid NOT NULL,
	"binding" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "hosted_login_states" (
	"state_hash" text PRIMARY KEY NOT NULL,
	"nonce" text NOT NULL,
	"code_verifier" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "hosted_preflight_reviews" (
	"revision_id" uuid PRIMARY KEY NOT NULL,
	"owner_key" text NOT NULL,
	"session_hash" text NOT NULL,
	"project_id" uuid NOT NULL,
	"draft_id" uuid NOT NULL,
	"snapshot" jsonb NOT NULL,
	"digest" text NOT NULL,
	"challenge_hash" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"result" jsonb
);
--> statement-breakpoint
CREATE TABLE "hosted_sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"owner_key" text NOT NULL,
	"actor_reference" text NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "owner_key" text DEFAULT 'local:legacy' NOT NULL;--> statement-breakpoint
CREATE INDEX "hosted_governed_reviews_session_idx" ON "hosted_governed_reviews" USING btree ("session_hash");--> statement-breakpoint
CREATE INDEX "hosted_preflight_reviews_pending_idx" ON "hosted_preflight_reviews" USING btree ("session_hash","draft_id");--> statement-breakpoint
CREATE INDEX "hosted_sessions_owner_idx" ON "hosted_sessions" USING btree ("owner_key");