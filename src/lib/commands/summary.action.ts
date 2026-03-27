"use server";

import { db } from "@/db";
import { messages, rooms } from "@/db/schema";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { asc, eq } from "drizzle-orm";

export async function generateLiveSummary(
	roomDailyName: string,
): Promise<{ content: string | null; error?: string }> {
	const room = await db.query.rooms.findFirst({
		where: eq(rooms.dailyRoomName, roomDailyName),
	});
	if (!room) return { content: null, error: "Room not found" };

	const allMessages = await db.query.messages.findMany({
		where: eq(messages.roomId, room.id),
		orderBy: [asc(messages.createdAt)],
	});

	if (allMessages.length === 0) {
		return { content: "Nothing to summarize yet — no messages or transcripts." };
	}

	const transcript = allMessages
		.map((m) => {
			const tag = m.type === "transcript" ? "[transcript]" : "[chat]";
			return `${tag} ${m.username}: ${m.content}`;
		})
		.join("\n");

	const { text } = await generateText({
		model: openai("gpt-4o-mini"),
		system: `You are a meeting assistant. Summarize the conversation so far in a concise way. Include key points discussed, any decisions made, and pending action items. Keep it short (3-5 bullet points max). Use plain text, no markdown. Start directly with the summary, no preamble.`,
		prompt: transcript,
	});

	return { content: text };
}
