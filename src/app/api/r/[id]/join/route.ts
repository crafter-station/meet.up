import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { participants, rooms } from "@/db/schema";
import { createMeetingToken, getDailyRoom } from "@/lib/daily";
import { checkIsOwner } from "@/lib/owner";
import { redis } from "@/lib/redis";
import { and, count, eq, isNull } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const { username, fingerprintId } = await req.json();
	const ownerSecret = req.headers.get("x-owner-secret");
	const { userId: clerkUserId } = await auth();

	const room = await db.query.rooms.findFirst({
		where: eq(rooms.dailyRoomName, id),
	});

	if (!room) {
		return NextResponse.json({ error: "Room not found" }, { status: 404 });
	}

	if (room.endedAt) {
		return NextResponse.json(
			{ error: "This meeting has ended" },
			{ status: 410 },
		);
	}

	const isOwner = checkIsOwner(ownerSecret, clerkUserId, room);

	if (!room.autoAccept && !isOwner) {
		const grantKey = `admission-grant:${room.id}:${username}`;
		const granted = await redis.get(grantKey);
		if (!granted) {
			return NextResponse.json({ status: "waiting" }, { status: 202 });
		}
		await redis.del(grantKey);
	}

	// ── Participant limit enforcement ──────────────────────────
	if (!isOwner) {
		const [{ value: activeCount }] = await db
			.select({ value: count() })
			.from(participants)
			.where(
				and(
					eq(participants.roomId, room.id),
					isNull(participants.leftAt),
				),
			);

		if (activeCount >= room.participantLimit) {
			return NextResponse.json(
				{ status: "room_full" },
				{ status: 403 },
			);
		}
	}

	const dailyRoom = await getDailyRoom(id);
	const { token } = await createMeetingToken(id, username);

	// Use fingerprintId for stable participant ID when available
	const stableId = fingerprintId ?? username;
	const participantId = `${stableId}_${room.id}`;
	await db
		.insert(participants)
		.values({
			id: participantId,
			roomId: room.id,
			username,
			clerkUserId: clerkUserId ?? null,
			fingerprintId: fingerprintId ?? null,
		})
		.onConflictDoUpdate({
			target: participants.id,
			set: {
				username,
				joinedAt: new Date(),
				clerkUserId: clerkUserId ?? null,
				fingerprintId: fingerprintId ?? null,
			},
		});

	return NextResponse.json({ token, roomUrl: dailyRoom.url });
}
