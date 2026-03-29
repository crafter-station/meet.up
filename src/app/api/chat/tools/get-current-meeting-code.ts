import { tool } from "ai";
import { z } from "zod";

export function getCurrentMeetingCodeTool(roomId: string) {
	const baseUrl =
		process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

	return {
		getCurrentMeetingCode: tool({
			description:
				"Get the room code and shareable link of the current meeting. Use this when you need to identify the current meeting, share its link, or look up its participants.",
			inputSchema: z.object({}),
			execute: async () => {
				return JSON.stringify({
					roomCode: roomId,
					meetingUrl: `${baseUrl}/${roomId}`,
				});
			},
		}),
	};
}
