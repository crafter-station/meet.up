"use client";

import { Button } from "@/components/ui/button";
import { useAdmission } from "@/hooks/use-admission";
import { getSupabaseClient } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useRoomContext } from "../context";

const JOIN_POLL_MS = 12_000;

export function WaitingView() {
	const {
		username,
		roomId,
		fingerprintId,
		cancelWaiting,
		onAdmissionAccepted,
		onAdmissionRejected,
		markMeetingEnded,
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

	// Same channel as in-call chat: host calls broadcastMeetingEnded when ending the meeting.
	useEffect(() => {
		const supabase = getSupabaseClient();
		const channel = supabase.channel(`room:${roomId}`);

		channel
			.on(
				"broadcast",
				{ event: "chat-event" },
				({ payload }: { payload: { type?: string } }) => {
					if (payload?.type === "meeting:ended") {
						markMeetingEnded();
					}
				},
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [roomId, markMeetingEnded]);

	// Backup when the room ends without a broadcast (e.g. last participant left).
	useEffect(() => {
		const name = username.trim();
		if (!name) return;

		const checkEnded = async () => {
			try {
				const res = await fetch(`/api/r/${roomId}/join`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ username: name, fingerprintId }),
				});
				if (res.status === 410) markMeetingEnded();
			} catch {
				/* ignore transient network errors */
			}
		};

		const id = window.setInterval(checkEnded, JOIN_POLL_MS);
		void checkEnded();

		return () => window.clearInterval(id);
	}, [roomId, username, fingerprintId, markMeetingEnded]);

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
