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

function GoogleCalendarIcon({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			className={className}
			aria-hidden="true"
		>
			<path
				d="M18.316 5.684H5.684v12.632h12.632V5.684Z"
				fill="#fff"
			/>
			<path
				d="M15.947 1.053 18.316 3.42l2.368-2.369L18.316 1.053h-2.369Z"
				fill="#EA4335"
			/>
			<path
				d="M18.316 3.421 20.684 1.053 22.947 3.316l-2.263 2.368-2.368-2.263Z"
				fill="#EA4335"
			/>
			<path
				d="M20.684 5.684v12.632L22.947 20.684V3.316l-2.263 2.368Z"
				fill="#FBBC04"
			/>
			<path
				d="M22.947 20.684 20.684 18.316l-2.368 2.368 2.368 2.263 2.263-1.963Z"
				fill="#34A853"
			/>
			<path
				d="M18.316 22.947l2.368-2.263H5.684l2.368 2.263h10.264Z"
				fill="#34A853"
			/>
			<path
				d="M3.316 20.684l2.368-2.368-2.368-2.368V20.684Z"
				fill="#188038"
			/>
			<path
				d="M3.316 5.684 5.684 3.421l-2.368-2.368v4.631Z"
				fill="#1967D2"
			/>
			<path
				d="M5.684 5.684V3.421L3.316 5.684h2.368Z"
				fill="#1967D2"
			/>
			<path
				d="M3.316 5.684v10.264l2.368 2.368V5.684H3.316Z"
				fill="#4285F4"
			/>
			<path
				d="M5.684 3.421l2.368-2.368H3.316L5.684 3.421Z"
				fill="#4285F4"
			/>
			<path
				d="M8.052 1.053h10.264L15.947 3.42H8.052l-2.368-2.368 2.368.001Z"
				fill="#EA4335"
			/>
			<path
				d="M8.4 16.8V8.4h1.2v3.12L12 9.6l2.4 1.92V8.4h1.2v8.4h-1.2v-5.28L12 13.44l-2.4-1.92V16.8H8.4Z"
				fill="#4285F4"
			/>
		</svg>
	);
}

export function GoogleCalendarCard() {
	const { user } = useUser();
	const [connecting, setConnecting] = useState(false);
	const [disconnecting, setDisconnecting] = useState(false);

	const account = user?.externalAccounts.find(
		(ea) => ea.provider === "google",
	);

	const connect = async () => {
		if (!user) return;
		setConnecting(true);
		try {
			const res = await user.createExternalAccount({
				strategy: "oauth_google",
				redirectUrl: "/settings",
			});
			const url =
				res.verification?.externalVerificationRedirectURL?.href;
			if (url) {
				window.location.href = url;
			}
		} catch {
			notify("error", { title: "Failed to connect Google Calendar" });
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
			notify("success", { title: "Google Calendar disconnected" });
		} catch {
			notify("error", {
				title: "Failed to disconnect Google Calendar",
			});
		} finally {
			setDisconnecting(false);
		}
	};

	const description = account
		? "Connected — the AI assistant can view and manage your calendar events during meetings."
		: "Connect your Google account to let the AI assistant view and manage your calendar during meetings.";

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
				icon={<GoogleCalendarIcon className="h-5 w-5" />}
				title="Google Calendar"
				description={description}
				action={action}
			/>
			{account && (
				<ConnectedBadge
					label={account.emailAddress ?? ""}
					detail={account.approvedScopes}
				/>
			)}
		</IntegrationCard>
	);
}
