import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { participants, rooms } from "@/db/schema";
import { checkIsOwner, hashSecret } from "@/lib/owner";
import { and, eq, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const { username } = await req.json();
	const ownerSecret = req.headers.get("x-owner-secret");
	const { userId: clerkUserId } = await auth();

	const room = await db.query.rooms.findFirst({
		where: eq(rooms.dailyRoomName, id),
	});

	if (!room || room.endedAt) {
		return NextResponse.json({ error: "Room not found" }, { status: 404 });
	}

	const isOwner = checkIsOwner(ownerSecret, clerkUserId, room);

	// Mark participant as left
	const participantId = `${username}_${room.id}`;
	await db
		.update(participants)
		.set({ leftAt: new Date() })
		.where(eq(participants.id, participantId));

	// Check remaining active participants
	const remaining = await db.query.participants.findMany({
		where: and(
			eq(participants.roomId, room.id),
			isNull(participants.leftAt),
		),
	});

	// Room is empty — end the meeting
	if (remaining.length === 0) {
		await db
			.update(rooms)
			.set({ endedAt: new Date() })
			.where(eq(rooms.id, room.id));
		return NextResponse.json({ ended: true });
	}

	// Anonymous owner leaving with others in room — transfer ownership
	if (isOwner && !clerkUserId) {
		// Prefer a Clerk-authenticated participant as the next owner
		const nextOwner =
			remaining.find((p) => p.clerkUserId) ?? remaining[0];

		const newSecret = nanoid(32);
		const newHash = hashSecret(newSecret);

		await db
			.update(rooms)
			.set({
				ownerSecretHash: newHash,
				ownerClerkUserId: nextOwner.clerkUserId ?? null,
			})
			.where(eq(rooms.id, room.id));

		return NextResponse.json({
			ended: false,
			transferred: {
				newOwner: nextOwner.username,
				ownerSecret: newSecret,
			},
		});
	}

	return NextResponse.json({ ended: false });
}
