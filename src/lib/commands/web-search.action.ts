"use server";

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const MAX_LENGTH = 1800;

export async function webSearch(
	query: string,
): Promise<{ content: string | null; error?: string }> {
	if (!query.trim()) {
		return { content: null, error: "No search query provided" };
	}

	const result = await generateText({
		model: openai("gpt-4o-mini"),
		system:
			"You are a concise search assistant inside a video call chat. Answer in plain text, no markdown. Keep your response under 1000 characters. Be direct and brief — just the key facts.",
		prompt: query,
		tools: {
			web_search: openai.tools.webSearch({
				searchContextSize: "medium",
			}),
		},
		toolChoice: { type: "tool", toolName: "web_search" },
	});

	const sources = result.sources ?? [];
	const uniqueUrls = [
		...new Set(
			sources
				.filter((s): s is typeof s & { url: string } => "url" in s)
				.map((s) => s.url),
		),
	].slice(0, 3);

	const answer = result.text || "No results found.";
	const sourcesSuffix =
		uniqueUrls.length > 0 ? `\n\nSources:\n${uniqueUrls.join("\n")}` : "";

	let content = `${answer}${sourcesSuffix}`;
	if (content.length > MAX_LENGTH) {
		content = `${content.slice(0, MAX_LENGTH - 3)}...`;
	}

	return { content };
}
