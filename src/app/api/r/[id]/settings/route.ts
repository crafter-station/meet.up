import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { checkIsOwner } from "@/lib/owner";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const { autoAccept } = await req.json();
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

	await db
		.update(rooms)
		.set({ autoAccept: Boolean(autoAccept) })
		.where(eq(rooms.id, room.id));

	return NextResponse.json({ autoAccept });
}
