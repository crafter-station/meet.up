import { gateway } from "@ai-sdk/gateway";
import { createMCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { generateText, stepCountIs } from "ai";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import {
	tools,
	getCurrentTimeTool,
	getCurrentMeetingCodeTool,
	getMeetingParticipantEmailsTool,
	scheduleMeetingTool,
	googleCalendarTools,
} from "@/app/api/chat/tools";

type MCPClient = Awaited<ReturnType<typeof createMCPClient>>;

async function initGitHubMCP(
	userId: string,
): Promise<{ client: MCPClient; tools: Record<string, unknown> } | null> {
	const clerk = await clerkClient();
	const tokens = await clerk.users.getUserOauthAccessToken(
		userId,
		"oauth_github",
	);
	const githubToken = tokens.data[0]?.token;
	if (!githubToken) return null;

	const transport = new Experimental_StdioMCPTransport({
		command: "npx",
		args: ["-y", "@modelcontextprotocol/server-github"],
		env: {
			...process.env,
			GITHUB_PERSONAL_ACCESS_TOKEN: githubToken,
		} as Record<string, string>,
	});

	const client = await createMCPClient({ transport });
	const mcpTools = await client.tools();

	return { client, tools: mcpTools };
}

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

const DETECT_PROMPT = `You are a voice command interpreter for a meeting app called meet.up. The user spoke a voice command during a live meeting.

Your job: describe in ONE short sentence what action the user wants. Be specific and include all details from the command (times, people, topics, etc.). Respond in the same language the user spoke.

If the command is completely unintelligible or empty, respond with exactly: NO_ACTION
Do not use emojis.`;

const EXECUTE_PROMPT = `You are a voice action executor for a live meeting app. Execute the following user command using the available tools.

RULES:
1. When scheduling or dealing with relative times, always call getCurrentTime first
2. Execute the action, then respond with a SHORT one-sentence summary of what you did
3. Respond in the same language the user spoke
4. Do not use emojis`;

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	let github: Awaited<ReturnType<typeof initGitHubMCP>> = null;

	try {
		const { id: roomId } = await params;
		const { command, mode } = await req.json();

		if (!command || typeof command !== "string" || !command.trim()) {
			return NextResponse.json({ proposal: null });
		}

		const room = await db.query.rooms.findFirst({
			where: eq(rooms.dailyRoomName, roomId),
		});

		if (!room || !room.voiceActionsEnabled) {
			return NextResponse.json({ proposal: null });
		}

		// ── Detect mode: describe the proposed action without executing ──
		if (mode === "detect") {
			const result = await generateText({
				model: gateway("anthropic/claude-sonnet-4-6"),
				system: DETECT_PROMPT,
				messages: [
					{ role: "user", content: `Command: ${command}` },
				],
			});

			const text = result.text?.trim();
			if (!text || text === "NO_ACTION") {
				return NextResponse.json({ proposal: null });
			}

			return NextResponse.json({ proposal: text });
		}

		// ── Execute mode: run tools ──
		const { userId } = await auth();

		let googleCalendar: ReturnType<typeof googleCalendarTools> | null = null;
		if (userId) {
			try {
				github = await initGitHubMCP(userId);
			} catch (e) {
				console.error("Voice actions: failed to init GitHub MCP:", e);
			}
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
			...tools(),
			...getCurrentTimeTool(),
			...meetingTools,
			...googleCalendar,
			...github?.tools,
		};

		const result = await generateText({
			model: gateway("anthropic/claude-sonnet-4-6"),
			system: EXECUTE_PROMPT,
			messages: [
				{ role: "user", content: `Command: ${command}` },
			],
			tools: allTools,
			stopWhen: stepCountIs(5),
		});

		const summary = result.text?.trim();

		return NextResponse.json({
			success: true,
			summary: summary || "Action executed",
		});
	} catch (error) {
		console.error("Voice actions error:", error);
		return NextResponse.json(
			{ error: "Failed to process voice action" },
			{ status: 500 },
		);
	} finally {
		await github?.client.close();
	}
}
