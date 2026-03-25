import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const rooms = pgTable("rooms", {
	id: uuid("id").defaultRandom().primaryKey(),
	dailyRoomName: text("daily_room_name").notNull().unique(),
	dailyRoomUrl: text("daily_room_url").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	expiresAt: timestamp("expires_at").notNull(),
});

export const participants = pgTable("participants", {
	id: text("id").primaryKey(), // `${visitorId}_${roomId}`
	roomId: uuid("room_id")
		.references(() => rooms.id)
		.notNull(),
	username: text("username").notNull(),
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
