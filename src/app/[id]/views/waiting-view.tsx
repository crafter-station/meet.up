"use client";

import { Button } from "@/components/ui/button";
import { useAdmission } from "@/hooks/use-admission";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useRoomContext } from "../context";

export function WaitingView() {
	const {
		username,
		roomId,
		cancelWaiting,
		onAdmissionAccepted,
		onAdmissionRejected,
	} = useRoomContext();

	const { requestAdmission, cancelRequest } = useAdmission({
		roomId,
		username: username.trim(),
		isOwner: false,
		onAccepted: onAdmissionAccepted,
		onRejected: onAdmissionRejected,
	});

	useEffect(() => {
		requestAdmission();
	}, [requestAdmission]);

	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
			<div className="text-center space-y-2">
				<Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
				<h1 className="text-2xl font-bold tracking-tight">
					Waiting to be admitted
				</h1>
				<p className="text-sm text-muted-foreground">
					The host will let you in soon...
				</p>
			</div>
			<Button
				variant="secondary"
				onClick={() => {
					cancelRequest();
					cancelWaiting();
				}}
			>
				Cancel
			</Button>
		</div>
	);
}
