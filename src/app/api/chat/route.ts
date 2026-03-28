import { gateway } from "@ai-sdk/gateway";
import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  type UIMessage,
} from "ai";
import { tools } from "./tools";
import { systemPrompt } from "./prompt";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages as UIMessage[];
    const transcript = body.transcript as string | undefined;

    const modelMessages = await convertToModelMessages(messages);

    const system = transcript
      ? `${systemPrompt}\n\n--- MEETING TRANSCRIPTION ---\n${transcript}\n--- END TRANSCRIPTION ---`
      : systemPrompt;

    const result = streamText({
      model: gateway("anthropic/claude-sonnet-4-6"),
      system,
      messages: modelMessages,
      tools: tools(),
      stopWhen: stepCountIs(3),
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
