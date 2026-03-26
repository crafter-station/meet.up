import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export interface MeetingSummary {
	title: string;
	summary: string;
	keyTopics: string[];
	actionItems: string[];
	decisions: string[];
	fullText: string;
}

interface MessageInput {
	username: string;
	content: string;
	type: string;
	timestamp: number;
}

function formatMessages(messages: MessageInput[]): string {
	return messages
		.map((m) => {
			const time = new Date(m.timestamp).toLocaleTimeString();
			const tag = m.type === "transcript" ? "[transcript]" : "[chat]";
			return `${time} ${tag} ${m.username}: ${m.content}`;
		})
		.join("\n");
}

export async function generateMeetingSummary(
	messages: MessageInput[],
	roomName: string,
): Promise<MeetingSummary> {
	const transcript = formatMessages(messages);

	const { text } = await generateText({
		model: openai("gpt-4o-mini"),
		system: `You are a meeting notes assistant. Given the following meeting transcript and chat messages, produce a structured summary. Output valid JSON with these keys:
- title: a short descriptive title for the meeting (max 10 words)
- summary: a 2-3 paragraph summary of what was discussed
- keyTopics: an array of strings listing the main topics covered
- actionItems: an array of strings listing any action items or tasks mentioned
- decisions: an array of strings listing any decisions that were made

If no action items or decisions are apparent, return empty arrays for those fields.
Only output the JSON object, no markdown fences or extra text.`,
		prompt: `Meeting room: ${roomName}\n\n${transcript}`,
	});

	try {
		const parsed = JSON.parse(text);
		return {
			title: parsed.title ?? "Meeting Summary",
			summary: parsed.summary ?? text,
			keyTopics: parsed.keyTopics ?? [],
			actionItems: parsed.actionItems ?? [],
			decisions: parsed.decisions ?? [],
			fullText: text,
		};
	} catch {
		return {
			title: "Meeting Summary",
			summary: text,
			keyTopics: [],
			actionItems: [],
			decisions: [],
			fullText: text,
		};
	}
}
