import { gateway } from "@ai-sdk/gateway";
import { generateText } from "ai";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

const DETECT_PROMPT = `You are a voice command interpreter for a meeting app called meet.up. The user spoke a voice command during a live meeting.

Your job: describe in ONE short sentence what action the user wants. Be specific and include all details from the command (times, people, topics, etc.). Respond in the same language the user spoke.

If the command is completely unintelligible or empty, respond with exactly: NO_ACTION
Do not use emojis.`;

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id: roomId } = await params;
		const { command } = await req.json();

		if (!command || typeof command !== "string" || !command.trim()) {
			return NextResponse.json({ proposal: null });
		}

		const room = await db.query.rooms.findFirst({
			where: eq(rooms.dailyRoomName, roomId),
		});

		if (!room || !room.voiceActionsEnabled) {
			return NextResponse.json({ proposal: null });
		}

		const result = await generateText({
			model: gateway("anthropic/claude-sonnet-4-6"),
			system: DETECT_PROMPT,
			messages: [{ role: "user", content: `Command: ${command}` }],
		});

		const text = result.text?.trim();
		if (!text || text === "NO_ACTION") {
			return NextResponse.json({ proposal: null });
		}

		return NextResponse.json({ proposal: text });
	} catch (error) {
		console.error("Voice actions error:", error);
		return NextResponse.json(
			{ error: "Failed to process voice action" },
			{ status: 500 },
		);
	}
}
