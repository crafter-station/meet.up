import { gateway } from "@ai-sdk/gateway";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { generateText, stepCountIs } from "ai";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import {
	getCurrentTimeTool,
	getCurrentMeetingCodeTool,
	getMeetingParticipantEmailsTool,
	scheduleMeetingTool,
	googleCalendarTools,
} from "@/app/api/chat/tools";

async function initGoogleCalendar(userId: string) {
	const clerk = await clerkClient();
	const tokens = await clerk.users.getUserOauthAccessToken(
		userId,
		"oauth_google",
	);
	const googleToken = tokens.data[0]?.token;
	if (!googleToken) return null;
	return googleCalendarTools(googleToken);
}

const VOICE_ACTIONS_PROMPT = `You are a voice action detector for a live meeting. You receive a short transcript chunk spoken during the meeting.

Your job: detect if someone is making an EXPLICIT, ACTIONABLE request that should be executed automatically. Only act on clear, unambiguous instructions.

ACTIONABLE requests (execute these):
- "Schedule a meeting for tomorrow at 3pm with the team"
- "Book a follow-up for next Tuesday at 10am"
- "Create a calendar event for Friday at 2pm called sprint review"
- "Set up a meeting with john@example.com for Monday"

NOT actionable (ignore these):
- "We should meet again sometime" (vague, no specific time)
- "Let's circle back on this" (no concrete instruction)
- "Maybe we can schedule something later" (tentative)
- "I have a meeting tomorrow" (statement, not a request)
- General discussion or conversation

RULES:
1. Only act when the intent is clear and specific
2. If the request needs a time, it must include a specific time reference
3. When scheduling, always call getCurrentTime first to resolve relative times
4. Prefer false negatives over false positives -- it is much better to miss an action than to execute one incorrectly
5. If no actionable request is detected, respond with exactly: NO_ACTION
6. If you do execute an action, respond with a SHORT one-sentence summary of what you did
7. Do not use emojis`;

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id: roomId } = await params;
		const { transcript } = await req.json();

		if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
			return NextResponse.json({ actions: [] });
		}

		const room = await db.query.rooms.findFirst({
			where: eq(rooms.dailyRoomName, roomId),
		});

		if (!room || !room.voiceActionsEnabled) {
			return NextResponse.json({ actions: [] });
		}

		const { userId } = await auth();

		let googleCalendar: ReturnType<typeof googleCalendarTools> | null = null;
		if (userId) {
			try {
				googleCalendar = await initGoogleCalendar(userId);
			} catch (e) {
				console.error("Voice actions: failed to init Google Calendar:", e);
			}
		}

		const meetingTools = userId
			? {
					...getCurrentMeetingCodeTool(roomId),
					...getMeetingParticipantEmailsTool(),
					...scheduleMeetingTool(),
				}
			: {};

		const allTools = {
			...getCurrentTimeTool(),
			...meetingTools,
			...googleCalendar,
		};

		const result = await generateText({
			model: gateway("anthropic/claude-sonnet-4-6"),
			system: VOICE_ACTIONS_PROMPT,
			messages: [
				{
					role: "user",
					content: `Transcript chunk:\n${transcript}`,
				},
			],
			tools: allTools,
			stopWhen: stepCountIs(5),
		});

		const actions: Array<{
			tool: string;
			description: string;
			result: unknown;
		}> = [];

		for (const step of result.steps) {
			for (const toolCall of step.toolCalls) {
				if (!toolCall) continue;
				actions.push({
					tool: toolCall.toolName,
					description: toolCall.toolName,
					result: undefined,
				});
			}
		}

		if (
			actions.length === 0 &&
			(!result.text || result.text.includes("NO_ACTION"))
		) {
			return NextResponse.json({ actions: [] });
		}

		const summary =
			actions.length > 0 && result.text && !result.text.includes("NO_ACTION")
				? result.text
				: undefined;

		return NextResponse.json({ actions, summary });
	} catch (error) {
		console.error("Voice actions error:", error);
		return NextResponse.json({ actions: [] }, { status: 500 });
	}
}
