"use client";

import { endMeeting } from "@/app/actions";
import { CamToggle, MicToggle } from "@/components/media-toggles";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import type { PendingRequest } from "@/hooks/use-admission";
import {
	useDaily,
	useDevices,
	useLocalSessionId,
	useParticipantProperty,
} from "@daily-co/daily-react";
import {
	Loader2,
	MessageSquare,
	PhoneOff,
	Settings,
	Square,
	UserCheck,
} from "lucide-react";
import { useEffect, useState } from "react";

interface CallControlsProps {
	showPanel: boolean;
	onTogglePanel: () => void;
	roomId: string;
	onMeetingEnded: () => void;
	isOwner: boolean;
	ownerSecret: string | null;
	pendingRequests: PendingRequest[];
	onAcceptUser: (username: string, ownerSecret: string) => void;
	onRejectUser: (username: string, ownerSecret: string) => void;
}

export function CallControls({
	showPanel,
	onTogglePanel,
	roomId,
	onMeetingEnded,
	isOwner,
	ownerSecret,
	pendingRequests,
	onAcceptUser,
	onRejectUser,
}: CallControlsProps) {
	const daily = useDaily();
	const localSessionId = useLocalSessionId();
	const audioState = useParticipantProperty(
		localSessionId,
		"tracks.audio.state",
	);
	const videoState = useParticipantProperty(
		localSessionId,
		"tracks.video.state",
	);
	const isMicOn = audioState === "playable" || audioState === "sendable";
	const isCamOn = videoState === "playable" || videoState === "sendable";
	const [ending, setEnding] = useState(false);

	const {
		cameras,
		microphones,
		currentCam,
		currentMic,
		setCamera,
		setMicrophone,
	} = useDevices();

	const toggleMic = () => daily?.setLocalAudio(!isMicOn);
	const toggleCam = () => daily?.setLocalVideo(!isCamOn);

	const micDevices = microphones.map((m) => ({
		deviceId: m.device.deviceId,
		label: m.device.label || `Microphone ${m.device.deviceId.slice(0, 4)}`,
	}));
	const camDevices = cameras.map((c) => ({
		deviceId: c.device.deviceId,
		label: c.device.label || `Camera ${c.device.deviceId.slice(0, 4)}`,
	}));

	const leave = () => {
		daily?.leave();
		daily?.destroy();
		window.location.href = "/";
	};

	const handleEndMeeting = async () => {
		setEnding(true);
		try {
			await endMeeting(roomId);
			onMeetingEnded();
			daily?.leave();
			daily?.destroy();
			window.location.href = `/summary/${roomId}`;
		} catch {
			daily?.leave();
			daily?.destroy();
			window.location.href = "/";
		}
	};

	return (
		<div className="flex items-center justify-center gap-2 border-t border-border px-4 py-3">
			<MicToggle
				isOn={isMicOn}
				onToggle={toggleMic}
				devices={micDevices}
				selectedDeviceId={currentMic?.device.deviceId ?? ""}
				onSelectDevice={setMicrophone}
			/>

			<CamToggle
				isOn={isCamOn}
				onToggle={toggleCam}
				devices={camDevices}
				selectedDeviceId={currentCam?.device.deviceId ?? ""}
				onSelectDevice={setCamera}
			/>

			<Button
				variant="secondary"
				size="icon"
				className="rounded-full h-12 w-12"
				onClick={leave}
				title="Leave call"
			>
				<PhoneOff className="h-5 w-5" />
			</Button>

			<Button
				variant="destructive"
				size="icon"
				className="rounded-full h-12 w-12"
				onClick={handleEndMeeting}
				disabled={ending}
				title="End meeting for everyone"
			>
				{ending ? (
					<Loader2 className="h-5 w-5 animate-spin" />
				) : (
					<Square className="h-4 w-4 fill-current" />
				)}
			</Button>

			<div className="mx-2 h-8 w-px bg-border" />

			<Button
				variant={showPanel ? "default" : "secondary"}
				size="icon"
				className="rounded-full h-12 w-12"
				onClick={onTogglePanel}
				title="Toggle chat"
			>
				<MessageSquare className="h-5 w-5" />
			</Button>

			{isOwner && (
				<>
					<RequestsDialog
						pendingRequests={pendingRequests}
						ownerSecret={ownerSecret!}
						onAccept={onAcceptUser}
						onReject={onRejectUser}
					/>
					<SettingsDialog roomId={roomId} ownerSecret={ownerSecret!} />
				</>
			)}
		</div>
	);
}

function RequestsDialog({
	pendingRequests,
	ownerSecret,
	onAccept,
	onReject,
}: {
	pendingRequests: PendingRequest[];
	ownerSecret: string;
	onAccept: (username: string, ownerSecret: string) => void;
	onReject: (username: string, ownerSecret: string) => void;
}) {
	return (
		<Dialog>
			<DialogTrigger
				render={
					<Button
						variant="secondary"
						size="icon"
						className="rounded-full h-12 w-12 relative"
						title="Join requests"
					/>
				}
			>
				<UserCheck className="h-5 w-5" />
				{pendingRequests.length > 0 && (
					<span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
						{pendingRequests.length}
					</span>
				)}
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Join Requests</DialogTitle>
					<DialogDescription>
						{pendingRequests.length === 0
							? "No one is waiting to join."
							: "People waiting to join this meeting:"}
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-2 max-h-60 overflow-y-auto">
					{pendingRequests.map((req) => (
						<div
							key={req.username}
							className="flex items-center justify-between p-2 rounded-lg bg-muted"
						>
							<span className="text-sm font-medium">{req.username}</span>
							<div className="flex gap-1">
								<Button
									size="sm"
									onClick={() => onAccept(req.username, ownerSecret)}
								>
									Accept
								</Button>
								<Button
									size="sm"
									variant="destructive"
									onClick={() => onReject(req.username, ownerSecret)}
								>
									Reject
								</Button>
							</div>
						</div>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}

function SettingsDialog({
	roomId,
	ownerSecret,
}: {
	roomId: string;
	ownerSecret: string;
}) {
	const [autoAccept, setAutoAccept] = useState(true);
	const [loading, setLoading] = useState(false);

	// Fetch current setting on mount
	useEffect(() => {
		// The setting defaults to true; no dedicated GET endpoint, so we use the local state.
		// It stays in sync because only the owner can change it.
	}, []);

	const toggle = async () => {
		setLoading(true);
		const next = !autoAccept;
		try {
			await fetch(`/api/r/${roomId}/settings`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					"X-Owner-Secret": ownerSecret,
				},
				body: JSON.stringify({ autoAccept: next }),
			});
			setAutoAccept(next);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog>
			<DialogTrigger
				render={
					<Button
						variant="secondary"
						size="icon"
						className="rounded-full h-12 w-12"
						title="Room settings"
					/>
				}
			>
				<Settings className="h-5 w-5" />
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Room Settings</DialogTitle>
				</DialogHeader>
				<div className="flex items-center justify-between py-2">
					<div className="space-y-0.5">
						<p className="text-sm font-medium">Auto-accept participants</p>
						<p className="text-xs text-muted-foreground">
							When off, you must approve each person before they can join.
						</p>
					</div>
					<Button
						variant={autoAccept ? "default" : "secondary"}
						size="sm"
						onClick={toggle}
						disabled={loading}
					>
						{autoAccept ? "On" : "Off"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
