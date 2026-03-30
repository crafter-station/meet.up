import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { getIntegration } from "@/lib/integrations/config";

export async function GET(req: Request) {
	const { userId } = await auth();
	if (!userId) return redirect("/sign-in");

	const url = new URL(req.url);
	const provider = url.searchParams.get("provider");
	if (!provider) {
		return Response.json({ error: "Missing provider" }, { status: 400 });
	}

	const config = getIntegration(provider);
	if (!config) {
		return Response.json({ error: "Unknown provider" }, { status: 400 });
	}

	const clientId = process.env[config.envClientId];
	if (!clientId) {
		return Response.json(
			{ error: "Provider not configured" },
			{ status: 500 },
		);
	}

	const state = nanoid(32);
	const cookieStore = await cookies();
	cookieStore.set(`oauth_state_${provider}`, state, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: 600,
		path: "/",
	});

	const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
	const redirectUri = `${baseUrl}/api/oauth/callback`;

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		state: `${provider}:${state}`,
		response_type: "code",
	});

	if (config.scopes.length > 0) {
		params.set("scope", config.scopes.join(" "));
	}

	if (provider === "google") {
		params.set("access_type", "offline");
		params.set("prompt", "consent");
	}

	if (config.authorizeParams) {
		for (const [key, value] of Object.entries(config.authorizeParams)) {
			params.set(key, value);
		}
	}

	return redirect(`${config.authorizeUrl}?${params.toString()}`);
}
