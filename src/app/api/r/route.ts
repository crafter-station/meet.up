import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { createDailyRoom } from "@/lib/daily";
import { hashSecret } from "@/lib/owner";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

export async function POST() {
	const roomId = nanoid(10);
	const room = await createDailyRoom(roomId);
	const ownerSecret = nanoid(32);
	const { userId: ownerClerkUserId } = await auth();

	await db.insert(rooms).values({
		dailyRoomName: room.name,
		dailyRoomUrl: room.url,
		expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
		ownerSecretHash: hashSecret(ownerSecret),
		ownerClerkUserId: ownerClerkUserId ?? null,
	});

	return NextResponse.json({
		id: room.name,
		url: room.url,
		ownerSecret,
	});
}
