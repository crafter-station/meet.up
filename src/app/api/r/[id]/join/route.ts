import { createMeetingToken, getDailyRoom } from "@/lib/daily";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const { username } = await req.json();

	const room = await getDailyRoom(id);
	const { token } = await createMeetingToken(id, username);

	return NextResponse.json({ token, roomUrl: room.url });
}
