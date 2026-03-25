import { createDailyRoom } from "@/lib/daily";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

export async function POST() {
	const roomId = nanoid(10);
	const room = await createDailyRoom(roomId);

	return NextResponse.json({
		id: room.name,
		url: room.url,
	});
}
