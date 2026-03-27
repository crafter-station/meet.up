import type { SlashCommand } from "./types";

export const summary: SlashCommand = {
	name: "summary",
	description: "Summarize the conversation so far (chat + transcriptions)",
	execute: async (ctx, _args) => {
		const { generateLiveSummary } = await import("./summary.action");
		const result = await generateLiveSummary(ctx.roomId);
		if (result.content) {
			ctx.sendMessageAs(result.content, "meet.up ai");
		}
	},
};
