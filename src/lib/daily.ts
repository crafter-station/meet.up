const DAILY_API_KEY = process.env.DAILY_API_KEY!;
const DAILY_API_URL = "https://api.daily.co/v1";

export async function createDailyRoom(name: string) {
	const res = await fetch(`${DAILY_API_URL}/rooms`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${DAILY_API_KEY}`,
		},
		body: JSON.stringify({
			name,
			properties: {
				max_participants: 10,
				exp: Math.floor(Date.now() / 1000) + 7200,
				enable_chat: false,
			},
		}),
	});

	if (!res.ok) {
		throw new Error(`Failed to create room: ${res.statusText}`);
	}

	return res.json() as Promise<{ name: string; url: string }>;
}

export async function getDailyRoom(name: string) {
	const res = await fetch(`${DAILY_API_URL}/rooms/${name}`, {
		headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
	});

	if (!res.ok) {
		throw new Error(`Room not found: ${res.statusText}`);
	}

	return res.json() as Promise<{ name: string; url: string }>;
}

export async function createMeetingToken(
	roomName: string,
	userName: string,
) {
	const res = await fetch(`${DAILY_API_URL}/meeting-tokens`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${DAILY_API_KEY}`,
		},
		body: JSON.stringify({
			properties: {
				room_name: roomName,
				user_name: userName,
				exp: Math.floor(Date.now() / 1000) + 7200,
			},
		}),
	});

	if (!res.ok) {
		throw new Error(`Failed to create token: ${res.statusText}`);
	}

	return res.json() as Promise<{ token: string }>;
}
