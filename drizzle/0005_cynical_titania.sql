CREATE TABLE "anonymous_users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "fingerprint_id" text;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "owner_fingerprint_id" text;