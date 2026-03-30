import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { oauthConnections } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getIntegration } from "@/lib/integrations/config";

export async function GET(req: Request) {
	const { userId } = await auth();
	if (!userId) return redirect("/sign-in");

	const url = new URL(req.url);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const error = url.searchParams.get("error");

	if (error) {
		return redirect(`/settings?oauth_error=${encodeURIComponent(error)}`);
	}

	if (!code || !state) {
		return redirect("/settings?oauth_error=missing_params");
	}

	const [provider, stateValue] = state.split(":", 2);
	const config = getIntegration(provider);
	if (!config) {
		return redirect("/settings?oauth_error=unknown_provider");
	}

	// Verify CSRF state
	const cookieStore = await cookies();
	const savedState = cookieStore.get(`oauth_state_${provider}`)?.value;
	cookieStore.delete(`oauth_state_${provider}`);

	if (!savedState || savedState !== stateValue) {
		return redirect("/settings?oauth_error=invalid_state");
	}

	// Exchange code for tokens
	const clientId = process.env[config.envClientId]!;
	const clientSecret = process.env[config.envClientSecret]!;
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
	const redirectUri = `${baseUrl}/api/oauth/callback`;

	const useBasicAuth = config.tokenAuthMethod === "basic";
	const useJson = config.tokenContentType === "json";

	const headers: Record<string, string> = {
		Accept: "application/json",
	};

	if (useBasicAuth) {
		headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
	}

	let body: string;
	if (useJson) {
		headers["Content-Type"] = "application/json";
		const payload: Record<string, string> = {
			code,
			redirect_uri: redirectUri,
			grant_type: "authorization_code",
		};
		if (!useBasicAuth) {
			payload.client_id = clientId;
			payload.client_secret = clientSecret;
		}
		body = JSON.stringify(payload);
	} else {
		headers["Content-Type"] = "application/x-www-form-urlencoded";
		const payload: Record<string, string> = {
			code,
			redirect_uri: redirectUri,
			grant_type: "authorization_code",
		};
		if (!useBasicAuth) {
			payload.client_id = clientId;
			payload.client_secret = clientSecret;
		}
		body = new URLSearchParams(payload).toString();
	}

	const tokenRes = await fetch(config.tokenUrl, {
		method: "POST",
		headers,
		body,
	});

	const tokenData = await tokenRes.json();

	if (!tokenData.access_token) {
		return redirect("/settings?oauth_error=token_exchange_failed");
	}

	const accountLabel = await fetchAccountLabel(
		config.provider,
		tokenData.access_token,
		tokenData,
	);

	// Upsert the connection
	const existing = await db.query.oauthConnections.findFirst({
		where: and(
			eq(oauthConnections.clerkUserId, userId),
			eq(oauthConnections.provider, provider),
		),
	});

	const now = new Date();
	const expiresAt = tokenData.expires_in
		? new Date(Date.now() + tokenData.expires_in * 1000)
		: null;

	if (existing) {
		await db
			.update(oauthConnections)
			.set({
				accessToken: tokenData.access_token,
				refreshToken: tokenData.refresh_token ?? existing.refreshToken,
				tokenExpiresAt: expiresAt,
				scopes: tokenData.scope ?? config.scopes.join(" "),
				accountLabel,
				updatedAt: now,
			})
			.where(eq(oauthConnections.id, existing.id));
	} else {
		await db.insert(oauthConnections).values({
			id: nanoid(),
			clerkUserId: userId,
			provider,
			accessToken: tokenData.access_token,
			refreshToken: tokenData.refresh_token ?? null,
			tokenExpiresAt: expiresAt,
			scopes: tokenData.scope ?? config.scopes.join(" "),
			accountLabel,
			createdAt: now,
			updatedAt: now,
		});
	}

	return redirect(`/settings?oauth_success=${provider}`);
}

async function fetchAccountLabel(
	provider: string,
	accessToken: string,
	tokenData: Record<string, unknown>,
): Promise<string | null> {
	try {
		if (provider === "google") {
			const res = await fetch(
				"https://www.googleapis.com/oauth2/v2/userinfo",
				{ headers: { Authorization: `Bearer ${accessToken}` } },
			);
			const data = await res.json();
			return data.email ?? null;
		}
		if (provider === "github") {
			const res = await fetch("https://api.github.com/user", {
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Accept: "application/vnd.github+json",
				},
			});
			const data = await res.json();
			return data.login ?? data.email ?? null;
		}
		if (provider === "notion") {
			return (tokenData.workspace_name as string) ?? null;
		}
		return null;
	} catch {
		return null;
	}
}
