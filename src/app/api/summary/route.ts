import { gateway } from "@ai-sdk/gateway";
import { db } from "@/db";
import { feedItems, meetingSummaries, messages, rooms } from "@/db/schema";
import { generateText, streamText } from "ai";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  const { roomId } = await req.json();

  const room = await db.query.rooms.findFirst({
    where: eq(rooms.dailyRoomName, roomId),
  });
  if (!room) {
    return Response.json({ error: "Room not found" }, { status: 404 });
  }

  // Check if summary already exists
  const existing = await db.query.meetingSummaries.findFirst({
    where: eq(meetingSummaries.roomId, room.id),
  });
  if (existing) {
    return Response.json({
      cached: true,
      title: existing.title,
      summary: existing.summary,
    });
  }

  // Fetch messages + feed items in parallel
  const [allMessages, allFeedItems] = await Promise.all([
    db.query.messages.findMany({
      where: eq(messages.roomId, room.id),
      orderBy: (m, { asc }) => [asc(m.createdAt)],
    }),
    db.query.feedItems.findMany({
      where: eq(feedItems.roomId, room.id),
      orderBy: (f, { asc }) => [asc(f.createdAt)],
    }),
  ]);

  // Format transcript
  const transcript = allMessages
    .map((m) => {
      const time = new Date(m.createdAt).toLocaleTimeString();
      const tag = m.type === "transcript" ? "[transcript]" : "[chat]";
      return `${time} ${tag} ${m.username}: ${m.content}`;
    })
    .join("\n");

  const feedSection =
    allFeedItems.length > 0
      ? `\n\n--- MEETING FEED ITEMS ---\n${allFeedItems
          .map((f) => {
            const time = new Date(f.createdAt).toLocaleTimeString();
            if (f.type === "artifact")
              return `${time} [artifact] ${f.title ?? "AI"}: ${f.content}`;
            if (f.type === "note")
              return `${time} [note] ${f.username}: ${f.content}`;
            if (f.type === "action_item")
              return `${time} [action-item] ${f.content} (done: ${f.isDone ? "yes" : "no"})`;
            return `${time} [${f.type}] ${f.content}`;
          })
          .join("\n")}`
      : "";

  const fullTranscript = `${transcript}${feedSection}`;

  // Step 1: Generate title fast (small prompt, no streaming)
  const { text: title } = await generateText({
    model: gateway("anthropic/claude-haiku-4-5"),
    system:
      "Generate a short, descriptive title for this meeting (max 8 words). Output ONLY the title, no quotes, no punctuation at the end. Use the same language as the transcript.",
    prompt: fullTranscript.slice(0, 3000),
  });

  const cleanTitle = title.replace(/^["']|["']$/g, "").trim();

  // Step 2: Stream the full summary
  const result = streamText({
    model: gateway("anthropic/claude-sonnet-4-6"),
    system: `You are a meeting summary assistant. Generate a comprehensive, well-structured meeting summary in markdown format.

The meeting title is: "${cleanTitle}"

Structure your response EXACTLY like this (do NOT include the title as an h1, it's already shown separately):

## Summary
[2-3 paragraph summary of the meeting]

## Key Topics
- [topic 1]
- [topic 2]
...

## Action Items
- [ ] [action item 1]
- [ ] [action item 2]
...

## Decisions
- [decision 1]
- [decision 2]
...

## Timeline Highlights
- **[HH:MM]** — [what happened]
- **[HH:MM]** — [what happened]
...

Guidelines:
- Be concise but thorough
- Use the actual timestamps from the transcript for the timeline
- Include who said what when relevant
- If there are pinned artifacts or notes, reference them in the summary
- Action items should include who is responsible if mentioned
- Respond in the same language as the transcript`,
    prompt: `Meeting room: ${roomId}\n\n${fullTranscript}`,
    onFinish: async ({ text }) => {
      const extractList = (heading: string): string[] => {
        const re = new RegExp(
          `## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`,
          "m",
        );
        const match = text.match(re);
        if (!match) return [];
        return match[1]
          .split("\n")
          .map((l) => l.replace(/^[-*]\s*(\[[ x]\]\s*)?/, "").trim())
          .filter(Boolean);
      };

      await db.insert(meetingSummaries).values({
        id: nanoid(),
        roomId: room.id,
        title: cleanTitle,
        summary: text,
        keyTopics: JSON.stringify(extractList("Key Topics")),
        actionItems: JSON.stringify(extractList("Action Items")),
        decisions: JSON.stringify(extractList("Decisions")),
      });
    },
  });

  // Return streaming response with title in a custom header
  const streamResponse = result.toTextStreamResponse();
  streamResponse.headers.set("X-Meeting-Title", encodeURIComponent(cleanTitle));
  return streamResponse;
}
