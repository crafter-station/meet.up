CREATE TABLE "feed_items" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" uuid NOT NULL,
	"username" text NOT NULL,
	"type" text NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"metadata" text,
	"is_done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feed_items" ADD CONSTRAINT "feed_items_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;