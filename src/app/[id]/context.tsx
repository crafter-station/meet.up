"use client";

import type { MediaSettings } from "@/components/media-preview";
import { createContext, useContext, useCallback, useState } from "react";

// ── State machine ──────────────────────────────────────────────

type RoomState =
	| { status: "preview" }
	| { status: "joining" }
	| { status: "waiting" }
	| { status: "in-call"; token: string; roomUrl: string }
	| { status: "rejected" }
	| { status: "ended" }
	| { status: "error"; message: string };

interface RoomContextValue {
	state: RoomState;
	username: string;
	setUsername: (v: string) => void;
	mediaSettings: MediaSettings;
	setMediaSettings: (v: MediaSettings) => void;
	isOwner: boolean;
	ownerSecret: string | null;
	roomId: string;
	joinRoom: () => Promise<void>;
	cancelWaiting: () => void;
	onAdmissionAccepted: () => void;
	onAdmissionRejected: () => void;
	leaveCall: () => void;
	updateOwnership: (secret: string) => void;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function useRoomContext() {
	const ctx = useContext(RoomContext);
	if (!ctx) throw new Error("useRoomContext must be used within RoomProvider");
	return ctx;
}

// ── Provider ───────────────────────────────────────────────────

interface RoomProviderProps {
	roomId: string;
	children: React.ReactNode;
}

export function RoomProvider({ roomId, children }: RoomProviderProps) {
	const [state, setState] = useState<RoomState>({ status: "preview" });
	const [username, setUsername] = useState("");
	const [mediaSettings, setMediaSettings] = useState<MediaSettings>({
		camOn: true,
		micOn: true,
		selectedCamId: "",
		selectedMicId: "",
	});

	const [ownerSecret, setOwnerSecret] = useState<string | null>(() =>
		typeof window !== "undefined"
			? sessionStorage.getItem(`ownerSecret:${roomId}`)
			: null,
	);
	const isOwner = !!ownerSecret;

	const updateOwnership = useCallback(
		(secret: string) => {
			sessionStorage.setItem(`ownerSecret:${roomId}`, secret);
			setOwnerSecret(secret);
		},
		[roomId],
	);

	const leaveCall = useCallback(() => {
		setState({ status: "preview" });
	}, []);

	const effectiveUsername = username.trim();

	const joinRoom = useCallback(async () => {
		if (!effectiveUsername) return;

		// Only set "joining" if we're coming from the preview (not re-joining after accept)
		setState((prev) =>
			prev.status === "preview" ? { status: "joining" } : prev,
		);

		try {
			const headers: Record<string, string> = {
				"Content-Type": "application/json",
			};
			if (ownerSecret) headers["X-Owner-Secret"] = ownerSecret;

			const res = await fetch(`/api/r/${roomId}/join`, {
				method: "POST",
				headers,
				body: JSON.stringify({ username: effectiveUsername }),
			});

			if (res.status === 410) {
				setState({ status: "ended" });
				return;
			}

			if (res.status === 202) {
				setState({ status: "waiting" });
				return;
			}

			if (!res.ok) throw new Error("Failed to join room");

			const data = await res.json();
			setState({ status: "in-call", token: data.token, roomUrl: data.roomUrl });
		} catch {
			setState({
				status: "error",
				message: "Could not join the room. Check the code and try again.",
			});
		}
	}, [effectiveUsername, roomId, ownerSecret]);

	const cancelWaiting = useCallback(() => {
		setState({ status: "preview" });
	}, []);

	const onAdmissionAccepted = useCallback(() => {
		// Re-call joinRoom — state stays "waiting" until we get the token
		joinRoom();
	}, [joinRoom]);

	const onAdmissionRejected = useCallback(() => {
		setState({ status: "rejected" });
	}, []);

	return (
		<RoomContext.Provider
			value={{
				state,
				username,
				setUsername,
				mediaSettings,
				setMediaSettings,
				isOwner,
				ownerSecret,
				roomId,
				joinRoom,
				cancelWaiting,
				onAdmissionAccepted,
				onAdmissionRejected,
				leaveCall,
				updateOwnership,
			}}
		>
			{children}
		</RoomContext.Provider>
	);
}
