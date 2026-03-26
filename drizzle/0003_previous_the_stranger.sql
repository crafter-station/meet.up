ALTER TABLE "rooms" ADD COLUMN "auto_accept" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "owner_secret_hash" text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "owner_clerk_user_id" text;