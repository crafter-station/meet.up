import { gateway } from "@ai-sdk/gateway";
import { createMCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  type UIMessage,
} from "ai";
import { tools } from "./tools";
import { googleCalendarTools } from "./tools/google-calendar";
import { getSystemPrompt } from "./prompt";

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

async function initGoogleCalendar(
  userId: string,
): Promise<ReturnType<typeof googleCalendarTools> | null> {
  const clerk = await clerkClient();
  const tokens = await clerk.users.getUserOauthAccessToken(
    userId,
    "oauth_google",
  );
  const googleToken = tokens.data[0]?.token;
  if (!googleToken) return null;

  return googleCalendarTools(googleToken);
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    const body = await req.json();
    const messages = body.messages as UIMessage[];
    const transcript = body.transcript as string | undefined;

    const modelMessages = await convertToModelMessages(messages);

    let github: Awaited<ReturnType<typeof initGitHubMCP>> = null;
    let googleCalendar: ReturnType<typeof googleCalendarTools> | null = null;
    if (userId) {
      try {
        github = await initGitHubMCP(userId);
      } catch (e) {
        console.error("Failed to initialize GitHub MCP:", e);
      }
      try {
        googleCalendar = await initGoogleCalendar(userId);
      } catch (e) {
        console.error("Failed to initialize Google Calendar:", e);
      }
    }

    const basePrompt = getSystemPrompt({
      hasGitHub: !!github,
      hasGoogleCalendar: !!googleCalendar,
    });
    const system = transcript
      ? `${basePrompt}\n\n--- MEETING TRANSCRIPTION ---\n${transcript}\n--- END TRANSCRIPTION ---`
      : basePrompt;

    const result = streamText({
      model: gateway("anthropic/claude-sonnet-4-6"),
      system,
      messages: modelMessages,
      tools: { ...tools(), ...github?.tools, ...googleCalendar },
      stopWhen: stepCountIs(5),
      onFinish: async () => {
        await github?.client.close();
      },
      onError: async () => {
        await github?.client.close();
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json(
      { error: "Failed to process chat request" },
      { status: 500 },
    );
  }
}
