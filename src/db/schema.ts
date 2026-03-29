import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const anonymousUsers = pgTable("anonymous_users", {
	id: text("id").primaryKey(), // fingerprint visitorId
	username: text("username").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rooms = pgTable("rooms", {
	id: uuid("id").defaultRandom().primaryKey(),
	dailyRoomName: text("daily_room_name").notNull().unique(),
	dailyRoomUrl: text("daily_room_url").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	endedAt: timestamp("ended_at"),
	autoAccept: boolean("auto_accept").notNull().default(true),
	ownerSecretHash: text("owner_secret_hash").notNull(),
	ownerClerkUserId: text("owner_clerk_user_id"),
	ownerFingerprintId: text("owner_fingerprint_id"),
});

export const participants = pgTable("participants", {
	id: text("id").primaryKey(), // `${fingerprintId}_${roomId}` or `${username}_${roomId}`
	roomId: uuid("room_id")
		.references(() => rooms.id)
		.notNull(),
	username: text("username").notNull(),
	clerkUserId: text("clerk_user_id"),
	fingerprintId: text("fingerprint_id"),
	joinedAt: timestamp("joined_at").defaultNow().notNull(),
	leftAt: timestamp("left_at"),
});

export const messages = pgTable("messages", {
	id: text("id").primaryKey(), // nanoid
	roomId: uuid("room_id")
		.references(() => rooms.id)
		.notNull(),
	username: text("username").notNull(),
	content: text("content").notNull(),
	type: text("type").notNull().default("chat"), // "chat" | "transcript"
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const feedItems = pgTable("feed_items", {
	id: text("id").primaryKey(), // nanoid
	roomId: uuid("room_id")
		.references(() => rooms.id)
		.notNull(),
	username: text("username").notNull(),
	type: text("type").notNull(), // "artifact" | "note" | "action_item"
	title: text("title"),
	content: text("content").notNull(),
	metadata: text("metadata"), // JSON blob for AI tool outputs
	isDone: boolean("is_done").notNull().default(false),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const scheduledMeetings = pgTable("scheduled_meetings", {
	id: text("id").primaryKey(), // nanoid
	roomId: uuid("room_id")
		.references(() => rooms.id)
		.notNull(),
	organizerClerkUserId: text("organizer_clerk_user_id").notNull(),
	title: text("title").notNull(),
	description: text("description"),
	scheduledAt: timestamp("scheduled_at").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const meetingInvitees = pgTable("meeting_invitees", {
	id: text("id").primaryKey(), // nanoid
	scheduledMeetingId: text("scheduled_meeting_id")
		.references(() => scheduledMeetings.id)
		.notNull(),
	email: text("email").notNull(),
	clerkUserId: text("clerk_user_id"),
	emailSentAt: timestamp("email_sent_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const meetingSummaries = pgTable("meeting_summaries", {
	id: text("id").primaryKey(),
	roomId: uuid("room_id")
		.references(() => rooms.id)
		.notNull(),
	title: text("title").notNull(),
	summary: text("summary").notNull(),
	keyTopics: text("key_topics").notNull(),
	actionItems: text("action_items").notNull(),
	decisions: text("decisions").notNull(),
	isPublic: boolean("is_public").notNull().default(false),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});
