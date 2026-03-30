export type IntegrationProvider = "google" | "github";

export interface IntegrationConfig {
	provider: IntegrationProvider;
	displayName: string;
	description: string;
	connectedDescription: string;
	authorizeUrl: string;
	tokenUrl: string;
	scopes: string[];
	envClientId: string;
	envClientSecret: string;
	supportsRefresh: boolean;
}

export const integrations: Record<IntegrationProvider, IntegrationConfig> = {
	google: {
		provider: "google",
		displayName: "Google Calendar",
		description:
			"Connect your Google account to let the AI assistant view and manage your calendar during meetings.",
		connectedDescription:
			"Connected \u2014 the AI assistant can view and manage your calendar events during meetings.",
		authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
		tokenUrl: "https://oauth2.googleapis.com/token",
		scopes: [
			"https://www.googleapis.com/auth/calendar",
			"https://www.googleapis.com/auth/userinfo.email",
		],
		envClientId: "GOOGLE_CLIENT_ID",
		envClientSecret: "GOOGLE_CLIENT_SECRET",
		supportsRefresh: true,
	},
	github: {
		provider: "github",
		displayName: "GitHub",
		description:
			"Connect your GitHub account to let the AI assistant manage repos, issues, and pull requests during meetings.",
		connectedDescription:
			"Connected \u2014 the AI assistant can manage repos, issues, and PRs during meetings.",
		authorizeUrl: "https://github.com/login/oauth/authorize",
		tokenUrl: "https://github.com/login/oauth/access_token",
		scopes: ["repo", "read:user", "user:email"],
		envClientId: "GITHUB_CLIENT_ID",
		envClientSecret: "GITHUB_CLIENT_SECRET",
		supportsRefresh: false,
	},
};

export function getIntegration(
	provider: string,
): IntegrationConfig | undefined {
	return integrations[provider as IntegrationProvider];
}

export function getAllIntegrations(): IntegrationConfig[] {
	return Object.values(integrations);
}
