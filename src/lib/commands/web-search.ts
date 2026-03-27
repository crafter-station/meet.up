import type { SlashCommand } from "./types";

export const webSearchCommand: SlashCommand = {
	name: "web-search",
	description: "Search the internet for something",
	params: [{ name: "query", description: "What to search for", required: true }],
	execute: async (ctx, args) => {
		if (!args.trim()) {
			ctx.sendMessageAs(
				"Please provide a search query, e.g. /web-search latest news on AI",
				"meet.up ai",
			);
			return;
		}
		const { webSearch } = await import("./web-search.action");
		const result = await webSearch(args);
		if (result.content) {
			ctx.sendMessageAs(result.content, "meet.up ai");
		}
	},
};
