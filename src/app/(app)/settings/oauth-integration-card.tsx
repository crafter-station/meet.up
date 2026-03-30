"use client";

import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { ExternalLink, Loader2, Unplug } from "lucide-react";
import { useState } from "react";
import {
	ConnectedBadge,
	IntegrationCard,
	IntegrationHeader,
} from "./integration-card";
import type { IntegrationConfig } from "@/lib/integrations/config";

export type ConnectionStatus = {
	provider: string;
	accountLabel: string | null;
	scopes: string | null;
};

export function OAuthIntegrationCard({
	config,
	connection,
	icon,
	onDisconnected,
}: {
	config: IntegrationConfig;
	connection: ConnectionStatus | null;
	icon: React.ReactNode;
	onDisconnected: () => void;
}) {
	const [connecting, setConnecting] = useState(false);
	const [disconnecting, setDisconnecting] = useState(false);

	const connect = () => {
		setConnecting(true);
		window.location.href = `/api/oauth/connect?provider=${config.provider}`;
	};

	const disconnect = async () => {
		setDisconnecting(true);
		try {
			const res = await fetch("/api/oauth/disconnect", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ provider: config.provider }),
			});
			if (!res.ok) throw new Error();
			notify("success", { title: `${config.displayName} disconnected` });
			onDisconnected();
		} catch {
			notify("error", {
				title: `Failed to disconnect ${config.displayName}`,
			});
		} finally {
			setDisconnecting(false);
		}
	};

	const isConnected = !!connection;
	const description = isConnected
		? config.connectedDescription
		: config.description;

	const action = isConnected ? (
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
				icon={icon}
				title={config.displayName}
				description={description}
				action={action}
			/>
			{isConnected && connection.accountLabel && (
				<ConnectedBadge
					label={connection.accountLabel}
					detail={connection.scopes}
				/>
			)}
		</IntegrationCard>
	);
}
