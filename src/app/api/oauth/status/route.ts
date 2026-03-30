import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { oauthConnections } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
	const { userId } = await auth();
	if (!userId) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const connections = await db.query.oauthConnections.findMany({
		where: eq(oauthConnections.clerkUserId, userId),
	});

	const status = connections.map((c) => ({
		provider: c.provider,
		accountLabel: c.accountLabel,
		scopes: c.scopes,
	}));

	return Response.json({ connections: status });
}
