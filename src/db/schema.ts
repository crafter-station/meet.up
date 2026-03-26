import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const rooms = pgTable("rooms", {
	id: uuid("id").defaultRandom().primaryKey(),
	dailyRoomName: text("daily_room_name").notNull().unique(),
	dailyRoomUrl: text("daily_room_url").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	endedAt: timestamp("ended_at"),
});

export const participants = pgTable("participants", {
	id: text("id").primaryKey(), // `${visitorId}_${roomId}`
	roomId: uuid("room_id")
		.references(() => rooms.id)
		.notNull(),
	username: text("username").notNull(),
	clerkUserId: text("clerk_user_id"),
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
	createdAt: timestamp("created_at").defaultNow().notNull(),
});
