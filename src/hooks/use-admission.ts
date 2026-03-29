"use client";

import { playAdmissionRequestSound } from "@/lib/notify";
import { getSupabaseClient } from "@/lib/supabase";
import { useCallback, useEffect, useRef, useState } from "react";

type AdmissionEvent =
	| { type: "admission:request"; username: string; timestamp: number }
	| { type: "admission:accept"; username: string }
	| { type: "admission:reject"; username: string }
	| { type: "admission:cancel"; username: string }
	| {
			type: "ownership:transferred";
			newOwner: string;
			ownerSecret: string;
	  };

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
	onOwnershipReceived?: (secret: string) => void;
}

export function useAdmission({
	roomId,
	username,
	isOwner,
	onAccepted,
	onRejected,
	onOwnershipReceived,
}: UseAdmissionOptions) {
	const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
	const pendingRequestsRef = useRef<PendingRequest[]>([]);
	const savedTabTitleRef = useRef<string | null>(null);
	const tabTitleIntervalRef = useRef<number | null>(null);
	const [waitingStatus, setWaitingStatus] = useState<
		"idle" | "waiting" | "accepted" | "rejected"
	>("idle");
	const channelRef = useRef<ReturnType<
		ReturnType<typeof getSupabaseClient>["channel"]
	> | null>(null);
	const pendingSendRef = useRef<AdmissionEvent | null>(null);
	const onAcceptedRef = useRef(onAccepted);
	const onRejectedRef = useRef(onRejected);
	const onOwnershipReceivedRef = useRef(onOwnershipReceived);
	onAcceptedRef.current = onAccepted;
	onRejectedRef.current = onRejected;
	onOwnershipReceivedRef.current = onOwnershipReceived;

	useEffect(() => {
		pendingRequestsRef.current = pendingRequests;
	}, [pendingRequests]);

	// Host: draw attention via document title (works when the tab is in the background).
	useEffect(() => {
		if (typeof document === "undefined") return;

		const clearBlink = () => {
			if (tabTitleIntervalRef.current != null) {
				clearInterval(tabTitleIntervalRef.current);
				tabTitleIntervalRef.current = null;
			}
		};

		const restoreTitle = () => {
			clearBlink();
			if (savedTabTitleRef.current != null) {
				document.title = savedTabTitleRef.current;
				savedTabTitleRef.current = null;
			}
		};

		if (!isOwner || pendingRequests.length === 0) {
			restoreTitle();
			return;
		}

		const count = pendingRequests.length;
		if (savedTabTitleRef.current === null) {
			savedTabTitleRef.current = document.title;
		}
		const base = savedTabTitleRef.current;
		const alertTitle = `(${count}) Waiting to join · ${base}`;

		const startBlinkIfHidden = () => {
			clearBlink();
			if (!document.hidden) return;
			tabTitleIntervalRef.current = window.setInterval(() => {
				const saved = savedTabTitleRef.current;
				if (saved == null) return;
				document.title =
					document.title === saved ? alertTitle : saved;
			}, 1200);
		};

		document.title = alertTitle;
		startBlinkIfHidden();

		const onVisibilityChange = () => {
			if (document.hidden) {
				document.title = alertTitle;
				startBlinkIfHidden();
			} else {
				clearBlink();
				document.title = base;
			}
		};

		document.addEventListener("visibilitychange", onVisibilityChange);

		return () => {
			document.removeEventListener("visibilitychange", onVisibilityChange);
			restoreTitle();
		};
	}, [isOwner, pendingRequests]);

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
								const alreadyQueued = pendingRequestsRef.current.some(
									(r) => r.username === payload.username,
								);
								if (!alreadyQueued) {
									playAdmissionRequestSound();
								}
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
						case "ownership:transferred":
							if (payload.newOwner === username) {
								onOwnershipReceivedRef.current?.(payload.ownerSecret);
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

	const broadcastOwnershipTransfer = useCallback(
		(newOwner: string, newOwnerSecret: string) => {
			channelRef.current?.send({
				type: "broadcast",
				event: "admission-event",
				payload: {
					type: "ownership:transferred",
					newOwner,
					ownerSecret: newOwnerSecret,
				} satisfies AdmissionEvent,
			});
		},
		[],
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
		broadcastOwnershipTransfer,
	};
}
