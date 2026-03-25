"use server";

import { db } from "@/db";
import { messages, rooms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function sendMessage(
	roomDailyName: string,
	username: string,
	content: string,
) {
	const trimmed = content.trim();
	if (!trimmed || trimmed.length > 2000) {
		return { error: "Message must be between 1 and 2000 characters" };
	}

	const room = await db.query.rooms.findFirst({
		where: eq(rooms.dailyRoomName, roomDailyName),
	});

	if (!room) {
		return { error: "Room not found" };
	}

	const id = nanoid();
	const now = new Date();

	await db.insert(messages).values({
		id,
		roomId: room.id,
		username,
		content: trimmed,
		type: "chat",
		createdAt: now,
	});

	return {
		message: {
			id,
			username,
			content: trimmed,
			timestamp: now.getTime(),
			type: "chat" as const,
		},
	};
}

export async function saveTranscript(
	roomDailyName: string,
	username: string,
	content: string,
) {
	const trimmed = content.trim();
	if (!trimmed) return { error: "Empty transcript" };

	const room = await db.query.rooms.findFirst({
		where: eq(rooms.dailyRoomName, roomDailyName),
	});

	if (!room) return { error: "Room not found" };

	const id = nanoid();
	const now = new Date();

	await db.insert(messages).values({
		id,
		roomId: room.id,
		username,
		content: trimmed,
		type: "transcript",
		createdAt: now,
	});

	return {
		message: {
			id,
			username,
			content: trimmed,
			timestamp: now.getTime(),
			type: "transcript" as const,
		},
	};
}

export async function getMessages(roomDailyName: string) {
	const room = await db.query.rooms.findFirst({
		where: eq(rooms.dailyRoomName, roomDailyName),
	});

	if (!room) return { messages: [] };

	const rows = await db.query.messages.findMany({
		where: eq(messages.roomId, room.id),
		orderBy: (m, { asc }) => [asc(m.createdAt)],
	});

	return {
		messages: rows.map((r) => ({
			id: r.id,
			username: r.username,
			content: r.content,
			timestamp: r.createdAt.getTime(),
			type: r.type as "chat" | "transcript",
		})),
	};
}
