CREATE TABLE "meeting_invitees" (
	"id" text PRIMARY KEY NOT NULL,
	"scheduled_meeting_id" text NOT NULL,
	"email" text NOT NULL,
	"clerk_user_id" text,
	"email_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_meetings" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" uuid NOT NULL,
	"organizer_clerk_user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"scheduled_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meeting_invitees" ADD CONSTRAINT "meeting_invitees_scheduled_meeting_id_scheduled_meetings_id_fk" FOREIGN KEY ("scheduled_meeting_id") REFERENCES "public"."scheduled_meetings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_meetings" ADD CONSTRAINT "scheduled_meetings_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;