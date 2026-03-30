import { db } from "@/db";
import { oauthConnections } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getIntegration, type IntegrationProvider } from "./config";

type OAuthConnection = typeof oauthConnections.$inferSelect;

/** Returns the full DB row for an oauth connection (no refresh). */
export async function getConnection(
	clerkUserId: string,
	provider: IntegrationProvider,
): Promise<OAuthConnection | null> {
	const connection = await db.query.oauthConnections.findFirst({
		where: and(
			eq(oauthConnections.clerkUserId, clerkUserId),
			eq(oauthConnections.provider, provider),
		),
	});
	return connection ?? null;
}

export async function getValidAccessToken(
	clerkUserId: string,
	provider: IntegrationProvider,
): Promise<string | null> {
	const connection = await getConnection(clerkUserId, provider);
	if (!connection) return null;

	const config = getIntegration(provider);
	if (!config) return null;

	// If no expiry or not yet expired, return current token
	if (
		!connection.tokenExpiresAt ||
		connection.tokenExpiresAt.getTime() > Date.now() + 60_000
	) {
		return connection.accessToken;
	}

	// Token expired — attempt refresh
	if (!config.supportsRefresh || !connection.refreshToken) {
		return null;
	}

	const clientId = process.env[config.envClientId];
	const clientSecret = process.env[config.envClientSecret];
	if (!clientId || !clientSecret) return null;

	const useJson = config.tokenContentType === "json";
	const refreshPayload = {
		client_id: clientId,
		client_secret: clientSecret,
		refresh_token: connection.refreshToken,
		grant_type: "refresh_token",
	};

	const res = await fetch(config.tokenUrl, {
		method: "POST",
		headers: {
			"Content-Type": useJson
				? "application/json"
				: "application/x-www-form-urlencoded",
		},
		body: useJson
			? JSON.stringify(refreshPayload)
			: new URLSearchParams(refreshPayload).toString(),
	});

	const data = await res.json();

	if (!data.access_token) {
		console.error(`Token refresh failed for ${provider}:`, data);
		return null;
	}

	const now = new Date();
	const expiresAt = data.expires_in
		? new Date(Date.now() + data.expires_in * 1000)
		: null;

	await db
		.update(oauthConnections)
		.set({
			accessToken: data.access_token,
			refreshToken: data.refresh_token ?? connection.refreshToken,
			tokenExpiresAt: expiresAt,
			updatedAt: now,
		})
		.where(eq(oauthConnections.id, connection.id));

	return data.access_token;
}
