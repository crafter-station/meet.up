import {
	fileRepository,
	generateObjectName,
} from "@/repositories/file-repository";
import { db } from "@/db";
import { feedItems, rooms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES = new Set([
	"image/png",
	"image/jpeg",
	"image/gif",
	"image/webp",
	"image/svg+xml",
	"application/pdf",
	"text/plain",
	"text/markdown",
	"text/csv",
	"application/json",
]);

function isAllowedType(mimeType: string): boolean {
	if (ALLOWED_TYPES.has(mimeType)) return true;
	if (mimeType.startsWith("image/")) return true;
	return false;
}

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id: roomDailyName } = await params;

		const room = await db.query.rooms.findFirst({
			where: eq(rooms.dailyRoomName, roomDailyName),
		});
		if (!room) {
			return NextResponse.json({ error: "Room not found" }, { status: 404 });
		}

		const formData = await req.formData();
		const file = formData.get("file") as File | null;
		const username = formData.get("username") as string | null;

		if (!file || !username) {
			return NextResponse.json(
				{ error: "Missing file or username" },
				{ status: 400 },
			);
		}

		if (file.size > MAX_FILE_SIZE) {
			return NextResponse.json(
				{ error: "File too large (max 10 MB)" },
				{ status: 400 },
			);
		}

		if (!isAllowedType(file.type)) {
			return NextResponse.json(
				{ error: "File type not allowed" },
				{ status: 400 },
			);
		}

		const objectName = generateObjectName(roomDailyName, file.name);
		const buffer = Buffer.from(await file.arrayBuffer());

		const { url } = await fileRepository.upload(
			buffer,
			objectName,
			file.type,
			file.size,
		);

		const id = nanoid();
		const now = new Date();
		const metadata = JSON.stringify({
			fileUrl: url,
			fileName: file.name,
			fileSize: file.size,
			fileType: file.type,
		});

		await db.insert(feedItems).values({
			id,
			roomId: room.id,
			username,
			type: "file",
			title: null,
			content: file.name,
			metadata,
			isDone: false,
			createdAt: now,
			updatedAt: now,
		});

		return NextResponse.json({
			item: {
				id,
				username,
				type: "file" as const,
				content: file.name,
				metadata,
				isDone: false,
				createdAt: now.getTime(),
				updatedAt: now.getTime(),
			},
		});
	} catch (error) {
		console.error("File upload error:", error);
		return NextResponse.json(
			{ error: "Failed to upload file" },
			{ status: 500 },
		);
	}
}
