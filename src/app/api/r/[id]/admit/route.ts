import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { verifyOwner } from "@/lib/owner";
import { redis } from "@/lib/redis";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const { username, action } = await req.json();
	const ownerSecret = req.headers.get("x-owner-secret");
	const { userId: clerkUserId } = await auth();

	const room = await db.query.rooms.findFirst({
		where: eq(rooms.dailyRoomName, id),
	});

	if (!room) {
		return NextResponse.json({ error: "Room not found" }, { status: 404 });
	}

	const isOwner =
		(ownerSecret && verifyOwner(ownerSecret, room.ownerSecretHash)) ||
		(clerkUserId &&
			room.ownerClerkUserId &&
			clerkUserId === room.ownerClerkUserId);

	if (!isOwner) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
	}

	if (action === "accept") {
		await redis.set(
			`admission-grant:${room.id}:${username}`,
			"granted",
			"EX",
			60,
		);
	}

	return NextResponse.json({ ok: true });
}
