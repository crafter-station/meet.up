import { gateway } from "@ai-sdk/gateway";
import { createMCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import { auth } from "@clerk/nextjs/server";
import {
  getValidAccessToken,
  getConnection,
} from "@/lib/integrations/token-service";
import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  type UIMessage,
} from "ai";
import {
  tools,
  getCurrentMeetingCodeTool,
  getCurrentTimeTool,
  getMeetingParticipantEmailsTool,
  googleCalendarTools,
  scheduleMeetingTool,
} from "./tools";
import { getSystemPrompt } from "./prompt";

type MCPClient = Awaited<ReturnType<typeof createMCPClient>>;

async function initGitHubMCP(
  userId: string,
): Promise<{ client: MCPClient; tools: Record<string, unknown> } | null> {
  const githubToken = await getValidAccessToken(userId, "github");
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

async function initNotionMCP(
  userId: string,
): Promise<{ client: MCPClient; tools: Record<string, unknown> } | null> {
  const notionToken = await getValidAccessToken(userId, "notion");
  if (!notionToken) return null;

  const transport = new Experimental_StdioMCPTransport({
    command: "npx",
    args: ["-y", "@notionhq/notion-mcp-server"],
    env: {
      ...process.env,
      OPENAPI_MCP_HEADERS: JSON.stringify({
        Authorization: `Bearer ${notionToken}`,
        "Notion-Version": "2022-06-28",
      }),
    } as Record<string, string>,
  });

  const client = await createMCPClient({ transport });
  const mcpTools = await client.tools();

  return { client, tools: mcpTools };
}

async function initJiraMCP(
  userId: string,
): Promise<{ client: MCPClient; tools: Record<string, unknown> } | null> {
  const jiraToken = await getValidAccessToken(userId, "jira");
  if (!jiraToken) return null;

  const connection = await getConnection(userId, "jira");
  if (!connection?.providerMetadata) return null;

  const metadata = JSON.parse(connection.providerMetadata) as {
    cloudId: string;
    siteUrl: string;
  };

  const transport = new Experimental_StdioMCPTransport({
    command: "uvx",
    args: ["mcp-atlassian"],
    env: {
      ...process.env,
      JIRA_URL: metadata.siteUrl,
      ATLASSIAN_OAUTH_CLOUD_ID: metadata.cloudId,
      ATLASSIAN_OAUTH_ACCESS_TOKEN: jiraToken,
    } as Record<string, string>,
  });

  const client = await createMCPClient({ transport });
  const mcpTools = await client.tools();

  return { client, tools: mcpTools };
}

async function initGoogleCalendar(
  userId: string,
): Promise<ReturnType<typeof googleCalendarTools> | null> {
  const googleToken = await getValidAccessToken(userId, "google");
  if (!googleToken) return null;

  return googleCalendarTools(googleToken);
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    const body = await req.json();
    const messages = body.messages as UIMessage[];
    const transcript = body.transcript as string | undefined;
    const roomId = body.roomId as string | undefined;

    const modelMessages = await convertToModelMessages(messages);

    let github: Awaited<ReturnType<typeof initGitHubMCP>> = null;
    let notion: Awaited<ReturnType<typeof initNotionMCP>> = null;
    let jira: Awaited<ReturnType<typeof initJiraMCP>> = null;
    let googleCalendar: ReturnType<typeof googleCalendarTools> | null = null;
    if (userId) {
      try {
        github = await initGitHubMCP(userId);
      } catch (e) {
        console.error("Failed to initialize GitHub MCP:", e);
      }
      try {
        notion = await initNotionMCP(userId);
      } catch (e) {
        console.error("Failed to initialize Notion MCP:", e);
      }
      try {
        jira = await initJiraMCP(userId);
      } catch (e) {
        console.error("Failed to initialize Jira MCP:", e);
      }
      try {
        googleCalendar = await initGoogleCalendar(userId);
      } catch (e) {
        console.error("Failed to initialize Google Calendar:", e);
      }
    }

    let meetingToolset: Record<string, unknown> | null = null;
    if (userId && roomId) {
      meetingToolset = {
        ...getCurrentMeetingCodeTool(roomId),
        ...getMeetingParticipantEmailsTool(),
        ...scheduleMeetingTool(),
      };
    }

    const basePrompt = getSystemPrompt({
      hasGitHub: !!github,
      hasNotion: !!notion,
      hasJira: !!jira,
      hasGoogleCalendar: !!googleCalendar,
      hasMeetingTools: !!meetingToolset,
    });
    const system = transcript
      ? `${basePrompt}\n\n--- MEETING TRANSCRIPTION ---\n${transcript}\n--- END TRANSCRIPTION ---`
      : basePrompt;

    const result = streamText({
      model: gateway("anthropic/claude-sonnet-4-6"),
      system,
      messages: modelMessages,
      tools: { ...tools(), ...getCurrentTimeTool(), ...github?.tools, ...notion?.tools, ...jira?.tools, ...googleCalendar, ...meetingToolset },
      stopWhen: stepCountIs(5),
      onFinish: async () => {
        await github?.client.close();
        await notion?.client.close();
        await jira?.client.close();
      },
      onError: async () => {
        await github?.client.close();
        await notion?.client.close();
        await jira?.client.close();
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
