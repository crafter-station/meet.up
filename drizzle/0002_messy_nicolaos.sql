CREATE TABLE "meeting_summaries" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"key_topics" text NOT NULL,
	"action_items" text NOT NULL,
	"decisions" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "clerk_user_id" text;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "ended_at" timestamp;--> statement-breakpoint
ALTER TABLE "meeting_summaries" ADD CONSTRAINT "meeting_summaries_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;