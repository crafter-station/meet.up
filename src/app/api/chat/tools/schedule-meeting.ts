import { tool } from "ai";
import { scheduleMeeting } from "@/app/actions";
import { z } from "zod";

export function scheduleMeetingTool() {
	return {
		scheduleNewMeeting: tool({
			description:
				"Schedule a new meeting and send invitation emails to attendees. Use this when the user wants to schedule or book a follow-up meeting. Returns the meeting URL that attendees can use to join.",
			inputSchema: z.object({
				title: z.string().describe("Title of the meeting"),
				description: z
					.string()
					.optional()
					.describe("Description or agenda for the meeting"),
				scheduledAt: z
					.string()
					.describe(
						"When the meeting should take place, in ISO 8601 format (e.g. 2025-06-15T14:00:00-05:00). Must be in the future.",
					),
				invitees: z
					.array(
						z.object({
							email: z
								.string()
								.email()
								.describe("Email address of the invitee"),
						}),
					)
					.min(1)
					.describe("List of people to invite to the meeting"),
			}),
			execute: async ({ title, description, scheduledAt, invitees }) => {
				const result = await scheduleMeeting({
					title,
					description,
					scheduledAt,
					invitees: invitees.map((inv) => ({ email: inv.email })),
				});

				if ("error" in result && result.error) {
					return JSON.stringify({ error: result.error });
				}

				if (result.data) {
					const baseUrl =
						process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
					const meetingUrl = `${baseUrl}/${result.data.roomCode}`;

					return JSON.stringify({
						meetingId: result.data.meetingId,
						roomCode: result.data.roomCode,
						meetingUrl,
						inviteeCount: invitees.length,
						scheduledAt,
					});
				}

				return JSON.stringify({
					error: "Unexpected response from scheduler",
				});
			},
		}),
	};
}
