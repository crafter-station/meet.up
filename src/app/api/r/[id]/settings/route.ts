import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { checkIsOwner } from "@/lib/owner";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;

	const room = await db.query.rooms.findFirst({
		where: eq(rooms.dailyRoomName, id),
	});

	if (!room) {
		return NextResponse.json({ error: "Room not found" }, { status: 404 });
	}

	return NextResponse.json({
		autoAccept: room.autoAccept,
		participantLimit: room.participantLimit,
		voiceActionsEnabled: room.voiceActionsEnabled,
	});
}

export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const { autoAccept, participantLimit, voiceActionsEnabled } = await req.json();
	const ownerSecret = req.headers.get("x-owner-secret");
	const { userId: clerkUserId } = await auth();

	const room = await db.query.rooms.findFirst({
		where: eq(rooms.dailyRoomName, id),
	});

	if (!room) {
		return NextResponse.json({ error: "Room not found" }, { status: 404 });
	}

	const isOwner = checkIsOwner(ownerSecret, clerkUserId, room);

	if (!isOwner) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
	}

	const updateData: Record<string, unknown> = {};

	if (autoAccept !== undefined) {
		updateData.autoAccept = Boolean(autoAccept);
	}

	if (participantLimit !== undefined) {
		const limit = Number(participantLimit);
		if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
			return NextResponse.json(
				{ error: "participantLimit must be an integer between 1 and 100" },
				{ status: 400 },
			);
		}
		updateData.participantLimit = limit;
	}

	if (voiceActionsEnabled !== undefined) {
		updateData.voiceActionsEnabled = Boolean(voiceActionsEnabled);
	}

	if (Object.keys(updateData).length > 0) {
		await db
			.update(rooms)
			.set(updateData)
			.where(eq(rooms.id, room.id));
	}

	return NextResponse.json({
		autoAccept: updateData.autoAccept ?? room.autoAccept,
		participantLimit: updateData.participantLimit ?? room.participantLimit,
		voiceActionsEnabled: updateData.voiceActionsEnabled ?? room.voiceActionsEnabled,
	});
}
