import { ImageResponse } from "next/og";
import { db } from "@/db";
import { meetingSummaries, participants, rooms } from "@/db/schema";
import { eq } from "drizzle-orm";

export const alt = "meet.up — Meeting Summary";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	const room = await db.query.rooms.findFirst({
		where: eq(rooms.dailyRoomName, id),
	});

	if (!room) {
		return new ImageResponse(
			(
				<div
					style={{
						width: "100%",
						height: "100%",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						backgroundColor: "#09090b",
						color: "#a1a1aa",
						fontSize: 32,
						fontFamily: "Geist",
					}}
				>
					Meeting not found
				</div>
			),
			size,
		);
	}

	const summary = await db.query.meetingSummaries.findFirst({
		where: eq(meetingSummaries.roomId, room.id),
	});

	const roomParticipants = await db.query.participants.findMany({
		where: eq(participants.roomId, room.id),
	});

	const participantNames = [
		...new Set(roomParticipants.map((p) => p.username)),
	];
	const participantCount = participantNames.length;
	const isPublic = summary?.isPublic ?? false;

	// For private summaries, show generic info
	const title = isPublic
		? summary?.title ?? "Meeting Summary"
		: "Private Meeting";
	const subtitle = isPublic
		? `${participantCount} participant${participantCount !== 1 ? "s" : ""} · ${room.endedAt ? new Date(room.endedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "In progress"}`
		: "Sign in to view this summary";

	const [geist, geistMedium] = await Promise.all([
		fetch(
			"https://fonts.gstatic.com/s/geist/v4/gyBhhwUxId8gMGYQMKR3pzfaWI_RnOM4nQ.ttf",
		).then((r) => r.arrayBuffer()),
		fetch(
			"https://fonts.gstatic.com/s/geist/v4/gyBhhwUxId8gMGYQMKR3pzfaWI_RruM4nQ.ttf",
		).then((r) => r.arrayBuffer()),
	]);

	return new ImageResponse(
		(
			<div
				style={{
					width: "100%",
					height: "100%",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					backgroundColor: "#09090b",
					padding: "60px",
				}}
			>
				{/* Main content */}
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						flex: 1,
						gap: "20px",
					}}
				>
					{/* Title */}
					<div
						style={{
							fontFamily: "Geist Medium",
							fontSize: 56,
							color: "#fafafa",
							textAlign: "center",
							lineHeight: 1.15,
							maxWidth: "900px",
							overflow: "hidden",
							textOverflow: "ellipsis",
						}}
					>
						{title}
					</div>

					{/* Subtitle */}
					<div
						style={{
							fontFamily: "Geist",
							fontSize: 24,
							color: "#71717a",
						}}
					>
						{subtitle}
					</div>

					{/* Participant avatars (public only) */}
					{isPublic && participantNames.length > 0 && (
						<div
							style={{
								display: "flex",
								gap: "8px",
								marginTop: "8px",
							}}
						>
							{participantNames.slice(0, 5).map((name) => (
								<div
									key={name}
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										width: "40px",
										height: "40px",
										borderRadius: "20px",
										backgroundColor: "#27272a",
										fontFamily: "Geist Medium",
										fontSize: 16,
										color: "#a1a1aa",
									}}
								>
									{name.charAt(0).toUpperCase()}
								</div>
							))}
							{participantNames.length > 5 && (
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										width: "40px",
										height: "40px",
										borderRadius: "20px",
										backgroundColor: "#27272a",
										fontFamily: "Geist",
										fontSize: 14,
										color: "#71717a",
									}}
								>
									+{participantNames.length - 5}
								</div>
							)}
						</div>
					)}
				</div>

				{/* Bottom bar */}
				<div
					style={{
						display: "flex",
						width: "100%",
						alignItems: "center",
						justifyContent: "space-between",
						borderTop: "1px solid #27272a",
						paddingTop: "24px",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							fontFamily: "Geist Medium",
							fontSize: 20,
							color: "#fafafa",
						}}
					>
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
							<rect x="2" y="6" width="14" height="12" rx="2" />
						</svg>
						meet.up
					</div>
					<div
						style={{
							fontFamily: "Geist",
							fontSize: 18,
							color: "#52525b",
						}}
					>
						Video calls with superpowers
					</div>
				</div>
			</div>
		),
		{
			...size,
			fonts: [
				{ name: "Geist", data: geist, weight: 400 as const },
				{ name: "Geist Medium", data: geistMedium, weight: 500 as const },
			],
		},
	);
}
