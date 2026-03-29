import { tool } from "ai";
import { z } from "zod";

export function getCurrentTimeTool() {
	return {
		getCurrentTime: tool({
			description:
				"Get the current date and time. Use this when you need to know the current time, for example to schedule meetings at a relative time like 'tomorrow at 3pm' or 'in 2 hours'.",
			inputSchema: z.object({
				timezone: z
					.string()
					.optional()
					.describe(
						"IANA timezone (e.g. America/New_York). Defaults to UTC.",
					),
			}),
			execute: async ({ timezone }) => {
				const now = new Date();
				const tz = timezone ?? "UTC";
				return JSON.stringify({
					iso: now.toISOString(),
					formatted: now.toLocaleString("en-US", { timeZone: tz }),
					timezone: tz,
					unix: now.getTime(),
				});
			},
		}),
	};
}
