"use client";

import { useReverification, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { ExternalLink, Loader2, Unplug } from "lucide-react";
import { useState } from "react";
import {
	ConnectedBadge,
	IntegrationCard,
	IntegrationHeader,
} from "./integration-card";

function GitHubIcon({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="currentColor"
			className={className}
			aria-hidden="true"
		>
			<path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
		</svg>
	);
}

export function GitHubCard() {
	const { user } = useUser();
	const [connecting, setConnecting] = useState(false);
	const [disconnecting, setDisconnecting] = useState(false);

	const account = user?.externalAccounts.find(
		(ea) => ea.provider === "github",
	);

	const connect = async () => {
		if (!user) return;
		setConnecting(true);
		try {
			const res = await user.createExternalAccount({
				strategy: "oauth_github",
				redirectUrl: "/settings",
			});
			const url =
				res.verification?.externalVerificationRedirectURL?.href;
			if (url) {
				window.location.href = url;
			}
		} catch {
			notify("error", { title: "Failed to connect GitHub" });
			setConnecting(false);
		}
	};

	const destroyAccount = useReverification(async () => {
		await account?.destroy();
	});

	const disconnect = async () => {
		if (!account) return;
		setDisconnecting(true);
		try {
			await destroyAccount();
			notify("success", { title: "GitHub disconnected" });
		} catch {
			notify("error", { title: "Failed to disconnect GitHub" });
		} finally {
			setDisconnecting(false);
		}
	};

	const description = account
		? "Connected — the AI assistant can manage repos, issues, and PRs during meetings."
		: "Connect your GitHub account to let the AI assistant manage repos, issues, and pull requests during meetings.";

	const action = account ? (
		<Button
			variant="outline"
			size="sm"
			onClick={disconnect}
			disabled={disconnecting}
			className="shrink-0 text-destructive hover:text-destructive"
		>
			{disconnecting ? (
				<Loader2 className="h-3.5 w-3.5 animate-spin" />
			) : (
				<Unplug className="h-3.5 w-3.5" />
			)}
			<span className="ml-1.5">Disconnect</span>
		</Button>
	) : (
		<Button
			size="sm"
			onClick={connect}
			disabled={connecting}
			className="shrink-0"
		>
			{connecting ? (
				<Loader2 className="h-3.5 w-3.5 animate-spin" />
			) : (
				<ExternalLink className="h-3.5 w-3.5" />
			)}
			<span className="ml-1.5">Connect</span>
		</Button>
	);

	return (
		<IntegrationCard>
			<IntegrationHeader
				icon={<GitHubIcon className="h-5 w-5" />}
				title="GitHub"
				description={description}
				action={action}
			/>
			{account && (
				<ConnectedBadge
					label={account.username ?? account.emailAddress ?? ""}
					detail={account.approvedScopes}
				/>
			)}
		</IntegrationCard>
	);
}
