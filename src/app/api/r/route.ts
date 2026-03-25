import { db } from "@/db";
import { rooms } from "@/db/schema";
import { createDailyRoom } from "@/lib/daily";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

export async function POST() {
	const roomId = nanoid(10);
	const room = await createDailyRoom(roomId);

	await db.insert(rooms).values({
		dailyRoomName: room.name,
		dailyRoomUrl: room.url,
		expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
	});

	return NextResponse.json({
		id: room.name,
		url: room.url,
	});
}
