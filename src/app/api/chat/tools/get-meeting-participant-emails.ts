import { tool } from "ai";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { participants, rooms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export function getMeetingParticipantEmailsTool() {
	return {
		getMeetingParticipantEmails: tool({
			description:
				"Get the email addresses of participants in a meeting. Only returns emails of authenticated users. Use this when the user wants to email meeting attendees, needs a participant list, or wants to know who is in a meeting.",
			inputSchema: z.object({
				roomCode: z
					.string()
					.describe(
						"The room code of the meeting. Use getCurrentMeetingCode to get the current meeting's code.",
					),
			}),
			execute: async ({ roomCode }) => {
				const room = await db.query.rooms.findFirst({
					where: eq(rooms.dailyRoomName, roomCode),
				});
				if (!room) {
					return JSON.stringify({ error: "Room not found" });
				}

				const roomParticipants = await db.query.participants.findMany({
					where: eq(participants.roomId, room.id),
				});

				const authenticated = roomParticipants.filter(
					(p) => p.clerkUserId,
				);

				const clerk = await clerkClient();
				const emails: Array<{ email: string; username: string }> = [];

				for (const participant of authenticated) {
					try {
						const user = await clerk.users.getUser(
							participant.clerkUserId!,
						);
						const email = user.emailAddresses[0]?.emailAddress;
						if (email) {
							emails.push({
								email,
								username: participant.username,
							});
						}
					} catch {
						// Skip participants whose Clerk data can't be fetched
					}
				}

				return JSON.stringify({
					roomCode,
					participantCount: roomParticipants.length,
					emails,
				});
			},
		}),
	};
}
