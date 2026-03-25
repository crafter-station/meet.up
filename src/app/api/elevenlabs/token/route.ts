import { NextResponse } from "next/server";

export async function GET() {
	const res = await fetch(
		"https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
		{
			method: "POST",
			headers: {
				"xi-api-key": process.env.ELEVENLABS_API_KEY!,
			},
		},
	);

	if (!res.ok) {
		const body = await res.text();
		console.error("ElevenLabs token error:", res.status, body);
		return NextResponse.json(
			{ error: "Failed to generate token", detail: body },
			{ status: 500 },
		);
	}

	const data = await res.json();
	return NextResponse.json({ token: data.token });
}
