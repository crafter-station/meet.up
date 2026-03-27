import type { SlashCommand } from "./types";

export const saySomething: SlashCommand = {
	name: "say-something",
	description: "AI generates something intelligent to say",
	execute: async (ctx, _args) => {
		const { generateSmartMessage } = await import("./say-something.action");
		const result = await generateSmartMessage(ctx.roomId, ctx.username);
		if (result.content) {
			ctx.sendMessageAs(result.content, "meet.up ai");
		}
	},
};
