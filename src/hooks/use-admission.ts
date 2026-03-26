"use client";

import { getSupabaseClient } from "@/lib/supabase";
import { useCallback, useEffect, useRef, useState } from "react";

type AdmissionEvent =
	| { type: "admission:request"; username: string; timestamp: number }
	| { type: "admission:accept"; username: string }
	| { type: "admission:reject"; username: string }
	| { type: "admission:cancel"; username: string };

export interface PendingRequest {
	username: string;
	timestamp: number;
}

interface UseAdmissionOptions {
	roomId: string;
	username: string;
	isOwner: boolean;
	onAccepted?: () => void;
	onRejected?: () => void;
}

export function useAdmission({
	roomId,
	username,
	isOwner,
	onAccepted,
	onRejected,
}: UseAdmissionOptions) {
	const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
	const [waitingStatus, setWaitingStatus] = useState<
		"idle" | "waiting" | "accepted" | "rejected"
	>("idle");
	const channelRef = useRef<ReturnType<
		ReturnType<typeof getSupabaseClient>["channel"]
	> | null>(null);
	const pendingSendRef = useRef<AdmissionEvent | null>(null);
	const onAcceptedRef = useRef(onAccepted);
	const onRejectedRef = useRef(onRejected);
	onAcceptedRef.current = onAccepted;
	onRejectedRef.current = onRejected;

	useEffect(() => {
		const supabase = getSupabaseClient();
		const channel = supabase.channel(`admission:${roomId}`);

		channel
			.on(
				"broadcast",
				{ event: "admission-event" },
				({ payload }: { payload: AdmissionEvent }) => {
					switch (payload.type) {
						case "admission:request":
							if (isOwner) {
								setPendingRequests((prev) => {
									if (prev.some((r) => r.username === payload.username))
										return prev;
									return [
										...prev,
										{
											username: payload.username,
											timestamp: payload.timestamp,
										},
									];
								});
							}
							break;
						case "admission:accept":
							if (payload.username === username && !isOwner) {
								setWaitingStatus("accepted");
								onAcceptedRef.current?.();
							}
							if (isOwner) {
								setPendingRequests((prev) =>
									prev.filter((r) => r.username !== payload.username),
								);
							}
							break;
						case "admission:reject":
							if (payload.username === username && !isOwner) {
								setWaitingStatus("rejected");
								onRejectedRef.current?.();
							}
							if (isOwner) {
								setPendingRequests((prev) =>
									prev.filter((r) => r.username !== payload.username),
								);
							}
							break;
						case "admission:cancel":
							if (isOwner) {
								setPendingRequests((prev) =>
									prev.filter((r) => r.username !== payload.username),
								);
							}
							break;
					}
				},
			)
			.subscribe(() => {
				channelRef.current = channel;
				// Flush any request that was queued before the channel was ready
				if (pendingSendRef.current) {
					channel.send({
						type: "broadcast",
						event: "admission-event",
						payload: pendingSendRef.current,
					});
					pendingSendRef.current = null;
				}
			});

		return () => {
			supabase.removeChannel(channel);
			channelRef.current = null;
		};
	}, [roomId, username, isOwner]);

	const requestAdmission = useCallback(() => {
		setWaitingStatus("waiting");
		const payload: AdmissionEvent = {
			type: "admission:request",
			username,
			timestamp: Date.now(),
		};
		if (channelRef.current) {
			channelRef.current.send({
				type: "broadcast",
				event: "admission-event",
				payload,
			});
		} else {
			pendingSendRef.current = payload;
		}
	}, [username]);

	const acceptUser = useCallback(
		async (targetUsername: string, ownerSecret: string) => {
			setPendingRequests((prev) =>
				prev.filter((r) => r.username !== targetUsername),
			);
			await fetch(`/api/r/${roomId}/admit`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Owner-Secret": ownerSecret,
				},
				body: JSON.stringify({ username: targetUsername, action: "accept" }),
			});
			channelRef.current?.send({
				type: "broadcast",
				event: "admission-event",
				payload: {
					type: "admission:accept",
					username: targetUsername,
				} satisfies AdmissionEvent,
			});
		},
		[roomId],
	);

	const rejectUser = useCallback(
		async (targetUsername: string, ownerSecret: string) => {
			setPendingRequests((prev) =>
				prev.filter((r) => r.username !== targetUsername),
			);
			await fetch(`/api/r/${roomId}/admit`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Owner-Secret": ownerSecret,
				},
				body: JSON.stringify({ username: targetUsername, action: "reject" }),
			});
			channelRef.current?.send({
				type: "broadcast",
				event: "admission-event",
				payload: {
					type: "admission:reject",
					username: targetUsername,
				} satisfies AdmissionEvent,
			});
		},
		[roomId],
	);

	const cancelRequest = useCallback(() => {
		setWaitingStatus("idle");
		channelRef.current?.send({
			type: "broadcast",
			event: "admission-event",
			payload: {
				type: "admission:cancel",
				username,
			} satisfies AdmissionEvent,
		});
	}, [username]);

	return {
		pendingRequests,
		waitingStatus,
		requestAdmission,
		acceptUser,
		rejectUser,
		cancelRequest,
	};
}
