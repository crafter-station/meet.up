import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { participants, rooms } from "@/db/schema";
import { createMeetingToken, getDailyRoom } from "@/lib/daily";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const { username } = await req.json();

	const { userId: clerkUserId } = await auth();

	const room = await db.query.rooms.findFirst({
		where: eq(rooms.dailyRoomName, id),
	});

	if (!room) {
		return NextResponse.json({ error: "Room not found" }, { status: 404 });
	}

	const dailyRoom = await getDailyRoom(id);
	const { token } = await createMeetingToken(id, username);

	const participantId = `${username}_${room.id}`;
	await db
		.insert(participants)
		.values({
			id: participantId,
			roomId: room.id,
			username,
			clerkUserId: clerkUserId ?? null,
		})
		.onConflictDoUpdate({
			target: participants.id,
			set: { username, joinedAt: new Date(), clerkUserId: clerkUserId ?? null },
		});

	return NextResponse.json({ token, roomUrl: dailyRoom.url });
}
