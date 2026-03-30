"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
	anonymousUsers,
	feedItems,
	meetingInvitees,
	meetingSummaries,
	messages,
	participants,
	rooms,
	scheduledMeetings,
} from "@/db/schema";
import { createDailyRoom } from "@/lib/daily";
import { generateUsername } from "@/lib/names";
import { hashSecret } from "@/lib/owner";
import { emailRepository } from "@/repositories/email-repository";
import { emailService } from "@/services/email-service";
import {
	buildInvitationEmail,
	buildSummaryEmail,
} from "@/services/email-template";
import {
	generateMeetingSummary,
	type MeetingSummary,
} from "@/services/summary-service";
import { and, eq, isNull, or, desc } from "drizzle-orm";
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

/** Fast end — just marks room as ended, no summary generation. */
export async function endMeetingQuick(roomDailyName: string) {
	const room = await db.query.rooms.findFirst({
		where: eq(rooms.dailyRoomName, roomDailyName),
	});
	if (!room) return { error: "Room not found" };
	if (room.endedAt) return { ok: true };

	await db
		.update(rooms)
		.set({ endedAt: new Date() })
		.where(eq(rooms.id, room.id));

	await db
		.update(participants)
		.set({ leftAt: new Date() })
		.where(eq(participants.roomId, room.id));

	return { ok: true };
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

	// 4b. Fetch all feed items
	const allFeedItems = await db.query.feedItems.findMany({
		where: eq(feedItems.roomId, room.id),
		orderBy: (f, { asc }) => [asc(f.createdAt)],
	});

	if (allMessages.length === 0 && allFeedItems.length === 0) {
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
			allFeedItems.map((f) => ({
				type: f.type,
				username: f.username,
				title: f.title ?? undefined,
				content: f.content,
				isDone: f.isDone,
			})),
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

// ── Feed items ──────────────────────────────────────────────────

export async function addFeedItem(
	roomDailyName: string,
	username: string,
	item: {
		type: string;
		title?: string;
		content: string;
		metadata?: string;
	},
) {
	const room = await db.query.rooms.findFirst({
		where: eq(rooms.dailyRoomName, roomDailyName),
	});
	if (!room) return { error: "Room not found" };

	const id = nanoid();
	const now = new Date();

	await db.insert(feedItems).values({
		id,
		roomId: room.id,
		username,
		type: item.type,
		title: item.title ?? null,
		content: item.content,
		metadata: item.metadata ?? null,
		isDone: false,
		createdAt: now,
		updatedAt: now,
	});

	return {
		item: {
			id,
			username,
			type: item.type as "artifact" | "note" | "action_item" | "file",
			title: item.title,
			content: item.content,
			metadata: item.metadata,
			isDone: false,
			createdAt: now.getTime(),
			updatedAt: now.getTime(),
		},
	};
}

export async function updateFeedItem(
	roomDailyName: string,
	itemId: string,
	updates: { content?: string; title?: string; isDone?: boolean },
) {
	const room = await db.query.rooms.findFirst({
		where: eq(rooms.dailyRoomName, roomDailyName),
	});
	if (!room) return { error: "Room not found" };

	const now = new Date();
	const values: Record<string, unknown> = { updatedAt: now };
	if (updates.content !== undefined) values.content = updates.content;
	if (updates.title !== undefined) values.title = updates.title;
	if (updates.isDone !== undefined) values.isDone = updates.isDone;

	await db
		.update(feedItems)
		.set(values)
		.where(eq(feedItems.id, itemId));

	return { success: true };
}

export async function getFeedItems(roomDailyName: string) {
	const room = await db.query.rooms.findFirst({
		where: eq(rooms.dailyRoomName, roomDailyName),
	});
	if (!room) return { items: [] };

	const rows = await db.query.feedItems.findMany({
		where: eq(feedItems.roomId, room.id),
		orderBy: (f, { asc }) => [asc(f.createdAt)],
	});

	return {
		items: rows.map((r) => ({
			id: r.id,
			username: r.username,
			type: r.type as "artifact" | "note" | "action_item" | "file",
			title: r.title ?? undefined,
			content: r.content,
			metadata: r.metadata ?? undefined,
			isDone: r.isDone,
			createdAt: r.createdAt.getTime(),
			updatedAt: r.updatedAt.getTime(),
		})),
	};
}

// ── Anonymous users ────────────────────────────────────────────

export async function getOrCreateUser(fingerprintId: string) {
	let user = await db.query.anonymousUsers.findFirst({
		where: eq(anonymousUsers.id, fingerprintId),
	});

	if (!user) {
		const username = generateUsername();
		const [newUser] = await db
			.insert(anonymousUsers)
			.values({ id: fingerprintId, username })
			.returning();
		user = newUser;
	}

	return user;
}

// ── User meetings ──────────────────────────────────────────────

export async function getUserMeetings(
	fingerprintId: string | null,
	clerkUserId: string | null,
) {
	if (!fingerprintId && !clerkUserId) return { meetings: [] };

	const conditions = [];
	if (fingerprintId)
		conditions.push(eq(participants.fingerprintId, fingerprintId));
	if (clerkUserId) conditions.push(eq(participants.clerkUserId, clerkUserId));

	const userParticipants = await db.query.participants.findMany({
		where: conditions.length === 1 ? conditions[0] : or(...conditions),
	});

	if (userParticipants.length === 0) return { meetings: [] };

	const roomIds = [...new Set(userParticipants.map((p) => p.roomId))];

	const meetingRooms = await Promise.all(
		roomIds.map((roomId) =>
			db.query.rooms.findFirst({ where: eq(rooms.id, roomId) }),
		),
	);

	const summaries = await Promise.all(
		roomIds.map((roomId) =>
			db.query.meetingSummaries.findFirst({
				where: eq(meetingSummaries.roomId, roomId),
			}),
		),
	);

	const participantsByRoom = await Promise.all(
		roomIds.map((roomId) =>
			db.query.participants.findMany({
				where: eq(participants.roomId, roomId),
			}),
		),
	);

	const meetings = meetingRooms
		.map((room, i) => {
			if (!room) return null;
			const summary = summaries[i];
			const roomParticipants = participantsByRoom[i];

			return {
				roomId: room.id,
				dailyRoomName: room.dailyRoomName,
				createdAt: room.createdAt.getTime(),
				endedAt: room.endedAt?.getTime() ?? null,
				isLive: !room.endedAt,
				title: summary?.title ?? null,
				summary: summary?.summary ?? null,
				participantNames: [
					...new Set(roomParticipants.map((p) => p.username)),
				],
				participantCount: roomParticipants.length,
			};
		})
		.filter(Boolean)
		.sort((a, b) => b!.createdAt - a!.createdAt);

	return { meetings };
}

// ── Summary access control ─────────────────────────────────────

export async function verifySummaryAccess(
	dailyRoomName: string,
	fingerprintId: string | null,
	clerkUserId: string | null,
): Promise<{ allowed: boolean }> {
	const room = await db.query.rooms.findFirst({
		where: eq(rooms.dailyRoomName, dailyRoomName),
	});
	if (!room) return { allowed: false };

	// Check if summary is public
	const summary = await db.query.meetingSummaries.findFirst({
		where: eq(meetingSummaries.roomId, room.id),
	});
	if (summary?.isPublic) return { allowed: true };

	// Check if user is a participant
	if (!fingerprintId && !clerkUserId) return { allowed: false };

	const conditions = [eq(participants.roomId, room.id)];
	const identityConditions = [];
	if (fingerprintId)
		identityConditions.push(eq(participants.fingerprintId, fingerprintId));
	if (clerkUserId)
		identityConditions.push(eq(participants.clerkUserId, clerkUserId));

	const participant = await db.query.participants.findFirst({
		where: and(...conditions, or(...identityConditions)),
	});

	return { allowed: !!participant };
}

export async function toggleSummaryVisibility(
	dailyRoomName: string,
	isPublic: boolean,
) {
	const room = await db.query.rooms.findFirst({
		where: eq(rooms.dailyRoomName, dailyRoomName),
	});
	if (!room) return { error: "Room not found" };

	const summary = await db.query.meetingSummaries.findFirst({
		where: eq(meetingSummaries.roomId, room.id),
	});
	if (!summary) return { error: "Summary not found" };

	await db
		.update(meetingSummaries)
		.set({ isPublic })
		.where(eq(meetingSummaries.id, summary.id));

	return { ok: true, isPublic };
}

// ── Scheduled meetings ─────────────────────────────────────────

export async function searchClerkUsers(query: string) {
	const { userId } = await auth();
	if (!userId) return { error: "Unauthorized", users: [] };

	const trimmed = query.trim();
	if (trimmed.length < 2) return { users: [] };

	const clerk = await clerkClient();
	const result = await clerk.users.getUserList({
		query: trimmed,
		limit: 5,
	});

	return {
		users: result.data
			.filter((u) => u.id !== userId)
			.map((u) => ({
				id: u.id,
				email: u.emailAddresses[0]?.emailAddress ?? null,
				firstName: u.firstName,
				lastName: u.lastName,
				imageUrl: u.imageUrl,
			})),
	};
}

export async function scheduleMeeting(data: {
	title: string;
	description?: string;
	scheduledAt: string;
	invitees: Array<{ email: string; clerkUserId?: string }>;
	fingerprintId?: string;
}) {
	const { userId } = await auth();
	if (!userId) return { error: "Unauthorized" };

	const title = data.title.trim();
	if (!title) return { error: "Title is required" };
	if (data.invitees.length === 0)
		return { error: "At least one invitee is required" };

	const scheduledDate = new Date(data.scheduledAt);
	if (Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date())
		return { error: "Scheduled time must be in the future" };

	// 1. Create Daily room with expiry based on scheduled time
	const roomCode = nanoid(10);
	const exp = Math.floor(scheduledDate.getTime() / 1000) + 7200;
	const room = await createDailyRoom(roomCode, exp);
	const ownerSecret = nanoid(32);

	// 2. Insert room
	const [insertedRoom] = await db
		.insert(rooms)
		.values({
			dailyRoomName: room.name,
			dailyRoomUrl: room.url,
			expiresAt: new Date(scheduledDate.getTime() + 2 * 60 * 60 * 1000),
			ownerSecretHash: hashSecret(ownerSecret),
			ownerClerkUserId: userId,
			ownerFingerprintId: data.fingerprintId ?? null,
		})
		.returning();

	// 3. Insert scheduled meeting
	const meetingId = nanoid();
	await db.insert(scheduledMeetings).values({
		id: meetingId,
		roomId: insertedRoom.id,
		organizerClerkUserId: userId,
		title,
		description: data.description?.trim() || null,
		scheduledAt: scheduledDate,
	});

	// 4. Get organizer info for email
	const clerk = await clerkClient();
	const organizer = await clerk.users.getUser(userId);
	const organizerName =
		[organizer.firstName, organizer.lastName].filter(Boolean).join(" ") ||
		organizer.emailAddresses[0]?.emailAddress ||
		"Someone";

	// 5. Send invitation emails
	const baseUrl =
		process.env.NEXT_PUBLIC_APP_URL ?? `https://${process.env.VERCEL_URL}`;
	const meetingUrl = `${baseUrl}/${room.name}`;

	for (const invitee of data.invitees) {
		const inviteeId = nanoid();
		const html = buildInvitationEmail({
			organizerName,
			title,
			description: data.description?.trim(),
			scheduledAt: scheduledDate,
			meetingUrl,
			roomCode: room.name,
		});
		const subject = `${organizerName} invited you: ${title}`;

		let emailSentAt: Date | null = null;
		try {
			const result = await emailService.send({
				to: invitee.email,
				subject,
				html,
			});

			await emailRepository.save({
				id: nanoid(),
				roomId: insertedRoom.id,
				to: invitee.email,
				subject,
				htmlBody: html,
				sentAt: new Date().toISOString(),
				resendId: result.id,
			});

			emailSentAt = new Date();
		} catch (err) {
			console.error(`Failed to send invite to ${invitee.email}:`, err);
		}

		await db.insert(meetingInvitees).values({
			id: inviteeId,
			scheduledMeetingId: meetingId,
			email: invitee.email,
			clerkUserId: invitee.clerkUserId ?? null,
			emailSentAt,
		});
	}

	return {
		data: {
			meetingId,
			roomCode: room.name,
			roomUrl: room.url,
			ownerSecret,
		},
	};
}

export async function getScheduledMeetings() {
	const { userId } = await auth();
	if (!userId) return { meetings: [] };

	const scheduled = await db.query.scheduledMeetings.findMany({
		where: eq(scheduledMeetings.organizerClerkUserId, userId),
		orderBy: (m, { desc: d }) => [d(m.scheduledAt)],
	});

	if (scheduled.length === 0) return { meetings: [] };

	const results = await Promise.all(
		scheduled.map(async (sm) => {
			const room = await db.query.rooms.findFirst({
				where: eq(rooms.id, sm.roomId),
			});
			const invitees = await db.query.meetingInvitees.findMany({
				where: eq(meetingInvitees.scheduledMeetingId, sm.id),
			});

			return {
				id: sm.id,
				title: sm.title,
				description: sm.description,
				scheduledAt: sm.scheduledAt.getTime(),
				createdAt: sm.createdAt.getTime(),
				roomCode: room?.dailyRoomName ?? "",
				roomUrl: room?.dailyRoomUrl ?? "",
				isLive: room ? !room.endedAt : false,
				hasEnded: !!room?.endedAt,
				invitees: invitees.map((inv) => ({
					email: inv.email,
					emailSent: !!inv.emailSentAt,
				})),
			};
		}),
	);

	return { meetings: results };
}
