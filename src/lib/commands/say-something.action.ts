"use server";

import { db } from "@/db";
import { messages, rooms } from "@/db/schema";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { asc, eq } from "drizzle-orm";

export async function generateSmartMessage(
	roomDailyName: string,
	username: string,
): Promise<{ content: string | null; error?: string }> {
	const room = await db.query.rooms.findFirst({
		where: eq(rooms.dailyRoomName, roomDailyName),
	});
	if (!room) return { content: null, error: "Room not found" };

	const recentMessages = await db.query.messages.findMany({
		where: eq(messages.roomId, room.id),
		orderBy: [asc(messages.createdAt)],
		limit: 30,
	});

	const transcript = recentMessages
		.map((m) => `${m.username}: ${m.content}`)
		.join("\n");

	const { text } = await generateText({
		model: openai("gpt-4o-mini"),
		system: `You are a helpful participant in a video call chat. Based on the recent conversation, generate a short, relevant, and engaging message that ${username} could send. Keep it natural, concise (1-2 sentences max), and contextually appropriate. If there is no conversation yet, generate a friendly conversation starter. Do not use quotation marks around your response.`,
		prompt: transcript || "(No messages yet — generate a conversation starter)",
	});

	return { content: text };
}
