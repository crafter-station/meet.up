"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { meetingSummaries, messages, participants, rooms } from "@/db/schema";
import { emailRepository } from "@/repositories/email-repository";
import { emailService } from "@/services/email-service";
import { buildSummaryEmail } from "@/services/email-template";
import {
	generateMeetingSummary,
	type MeetingSummary,
} from "@/services/summary-service";
import { eq, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function sendMessage(
	roomDailyName: string,
	username: string,
	content: string,
) {
	const trimmed = content.trim();
	if (!trimmed || trimmed.length > 2000) {
		return { error: "Message must be between 1 and 2000 characters" };
	}

	const room = await db.query.rooms.findFirst({
		where: eq(rooms.dailyRoomName, roomDailyName),
	});

	if (!room) {
		return { error: "Room not found" };
	}

	const id = nanoid();
	const now = new Date();

	await db.insert(messages).values({
		id,
		roomId: room.id,
		username,
		content: trimmed,
		type: "chat",
		createdAt: now,
	});

	return {
		message: {
			id,
			username,
			content: trimmed,
			timestamp: now.getTime(),
			type: "chat" as const,
		},
	};
}

export async function saveTranscript(
	roomDailyName: string,
	username: string,
	content: string,
) {
	const trimmed = content.trim();
	if (!trimmed) return { error: "Empty transcript" };

	const room = await db.query.rooms.findFirst({
		where: eq(rooms.dailyRoomName, roomDailyName),
	});

	if (!room) return { error: "Room not found" };

	const id = nanoid();
	const now = new Date();

	await db.insert(messages).values({
		id,
		roomId: room.id,
		username,
		content: trimmed,
		type: "transcript",
		createdAt: now,
	});

	return {
		message: {
			id,
			username,
			content: trimmed,
			timestamp: now.getTime(),
			type: "transcript" as const,
		},
	};
}

export async function getMessages(roomDailyName: string) {
	const room = await db.query.rooms.findFirst({
		where: eq(rooms.dailyRoomName, roomDailyName),
	});

	if (!room) return { messages: [] };

	const rows = await db.query.messages.findMany({
		where: eq(messages.roomId, room.id),
		orderBy: (m, { asc }) => [asc(m.createdAt)],
	});

	return {
		messages: rows.map((r) => ({
			id: r.id,
			username: r.username,
			content: r.content,
			timestamp: r.createdAt.getTime(),
			type: r.type as "chat" | "transcript",
		})),
	};
}

export async function endMeeting(roomDailyName: string): Promise<{
	summary: MeetingSummary | null;
	emailsSent: number;
	error?: string;
}> {
	// 1. Look up the room
	const room = await db.query.rooms.findFirst({
		where: eq(rooms.dailyRoomName, roomDailyName),
	});

	if (!room) return { summary: null, emailsSent: 0, error: "Room not found" };

	// If already ended, return existing summary
	if (room.endedAt) {
		const existing = await db.query.meetingSummaries.findFirst({
			where: eq(meetingSummaries.roomId, room.id),
		});
		if (existing) {
			return {
				summary: {
					title: existing.title,
					summary: existing.summary,
					keyTopics: JSON.parse(existing.keyTopics),
					actionItems: JSON.parse(existing.actionItems),
					decisions: JSON.parse(existing.decisions),
					fullText: existing.summary,
				},
				emailsSent: 0,
			};
		}
		return { summary: null, emailsSent: 0 };
	}

	// 2. Mark room as ended
	await db
		.update(rooms)
		.set({ endedAt: new Date() })
		.where(eq(rooms.id, room.id));

	// 3. Update leftAt for all participants still in the room
	await db
		.update(participants)
		.set({ leftAt: new Date() })
		.where(eq(participants.roomId, room.id));

	// 4. Fetch all messages
	const allMessages = await db.query.messages.findMany({
		where: eq(messages.roomId, room.id),
		orderBy: (m, { asc }) => [asc(m.createdAt)],
	});

	if (allMessages.length === 0) {
		return { summary: null, emailsSent: 0 };
	}

	// 5. Generate AI summary
	let summary: MeetingSummary | null = null;
	try {
		summary = await generateMeetingSummary(
			allMessages.map((m) => ({
				username: m.username,
				content: m.content,
				type: m.type,
				timestamp: m.createdAt.getTime(),
			})),
			roomDailyName,
		);

		// Save summary to DB
		await db.insert(meetingSummaries).values({
			id: nanoid(),
			roomId: room.id,
			title: summary.title,
			summary: summary.summary,
			keyTopics: JSON.stringify(summary.keyTopics),
			actionItems: JSON.stringify(summary.actionItems),
			decisions: JSON.stringify(summary.decisions),
		});
	} catch (err) {
		console.error("Failed to generate summary:", err);
		return { summary: null, emailsSent: 0, error: "Failed to generate summary" };
	}

	// 6. Find authenticated participants and send emails
	let emailsSent = 0;
	try {
		const roomParticipants = await db.query.participants.findMany({
			where: eq(participants.roomId, room.id),
		});

		const authenticatedParticipants = roomParticipants.filter(
			(p) => p.clerkUserId,
		);

		const clerk = await clerkClient();

		for (const participant of authenticatedParticipants) {
			try {
				const user = await clerk.users.getUser(participant.clerkUserId!);
				const email = user.emailAddresses[0]?.emailAddress;
				if (!email) continue;

				const html = buildSummaryEmail(summary, roomDailyName, new Date());
				const subject = `Meeting Notes: ${summary.title}`;

				const result = await emailService.send({ to: email, subject, html });

				const emailId = nanoid();
				await emailRepository.save({
					id: emailId,
					roomId: room.id,
					to: email,
					subject,
					htmlBody: html,
					sentAt: new Date().toISOString(),
					resendId: result.id,
				});

				emailsSent++;
			} catch (err) {
				console.error(`Failed to send email to participant ${participant.id}:`, err);
			}
		}
	} catch (err) {
		console.error("Failed to process email delivery:", err);
	}

	return { summary, emailsSent };
}
