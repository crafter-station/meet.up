import { gateway } from "@ai-sdk/gateway";
import { generateText } from "ai";

export async function POST(req: Request) {
  const { content } = await req.json();

  const { text } = await generateText({
    model: gateway("anthropic/claude-haiku-4-5-20251001"),
    system:
      "Generate a short, contextual title (3-6 words) for this meeting artifact. Return only the title, nothing else. No quotes. No punctuation at the end.",
    prompt: content.slice(0, 1000),
  });

  return Response.json({ title: text.trim() });
}
