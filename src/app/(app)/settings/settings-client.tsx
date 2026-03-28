"use client";

import { useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { GitHubCard } from "./github-card";

export function SettingsClient() {
	const { isLoaded } = useUser();

	if (!isLoaded) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="flex flex-1 flex-col items-center px-4 py-8">
			<div className="w-full max-w-2xl space-y-8">
				<div className="space-y-1">
					<h1 className="text-2xl font-bold tracking-tight">
						Settings
					</h1>
					<p className="text-sm text-muted-foreground">
						Manage your integrations and preferences
					</p>
				</div>

				<div className="space-y-4">
					<h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
						Integrations
					</h2>
					<GitHubCard />
				</div>
			</div>
		</div>
	);
}
