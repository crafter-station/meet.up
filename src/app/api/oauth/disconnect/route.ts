import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { oauthConnections } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: Request) {
	const { userId } = await auth();
	if (!userId) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { provider } = await req.json();
	if (!provider) {
		return Response.json({ error: "Missing provider" }, { status: 400 });
	}

	await db
		.delete(oauthConnections)
		.where(
			and(
				eq(oauthConnections.clerkUserId, userId),
				eq(oauthConnections.provider, provider),
			),
		);

	return Response.json({ ok: true });
}
