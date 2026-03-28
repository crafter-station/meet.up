import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
	feedItems,
	meetingSummaries,
	messages,
	participants,
	rooms,
} from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { SummaryClient } from "./summary-client";
import { AccessGate } from "./access-gate";

export default async function SummaryPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	const room = await db.query.rooms.findFirst({
		where: eq(rooms.dailyRoomName, id),
	});

	if (!room) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
				<p className="text-muted-foreground">Meeting not found</p>
			</div>
		);
	}

	// Check if summary is public
	const summary = await db.query.meetingSummaries.findFirst({
		where: eq(meetingSummaries.roomId, room.id),
	});
	const isPublic = summary?.isPublic ?? false;

	// Check Clerk auth for server-side access
	let clerkAllowed = false;
	const { userId: clerkUserId } = await auth();
	if (clerkUserId) {
		const participant = await db.query.participants.findFirst({
			where: and(
				eq(participants.roomId, room.id),
				eq(participants.clerkUserId, clerkUserId),
			),
		});
		clerkAllowed = !!participant;
	}

	// Fetch data in parallel
	const [allMessages, allFeedItems] = await Promise.all([
		db.query.messages.findMany({
			where: eq(messages.roomId, room.id),
			orderBy: (m, { asc }) => [asc(m.createdAt)],
		}),
		db.query.feedItems.findMany({
			where: eq(feedItems.roomId, room.id),
			orderBy: (f, { asc }) => [asc(f.createdAt)],
		}),
	]);

	const meetingDate = room.endedAt ?? room.createdAt;

	const participantNames = [
		...new Set(
			allMessages
				.filter((m) => m.type === "transcript")
				.map((m) => m.username),
		),
	];

	const transcriptCount = allMessages.filter(
		(m) => m.type === "transcript",
	).length;

	const artifacts = allFeedItems
		.filter((f) => f.type === "artifact")
		.map((f) => ({
			id: f.id,
			title: f.title ?? "AI Response",
			content: f.content,
			username: f.username,
			time: f.createdAt.toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			}),
		}));

	const notes = allFeedItems
		.filter((f) => f.type === "note")
		.map((f) => ({
			id: f.id,
			content: f.content,
			username: f.username,
			time: f.createdAt.toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			}),
		}));

	const actionItems = allFeedItems
		.filter((f) => f.type === "action_item")
		.map((f) => ({
			id: f.id,
			content: f.content,
			isDone: f.isDone,
		}));

	const summaryContent = (
		<SummaryClient
			roomId={id}
			meetingDate={meetingDate.toISOString()}
			participantNames={participantNames}
			transcriptCount={transcriptCount}
			artifacts={artifacts}
			notes={notes}
			actionItems={actionItems}
			isPublic={isPublic}
		/>
	);

	// Public or Clerk-authenticated participant → render immediately
	if (isPublic || clerkAllowed) {
		return summaryContent;
	}

	// Otherwise → client-side fingerprint check
	return <AccessGate roomId={id}>{summaryContent}</AccessGate>;
}
