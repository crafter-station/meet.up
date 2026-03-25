"use client";

import { Button } from "@/components/ui/button";
import {
	useDaily,
	useLocalSessionId,
	useParticipantProperty,
} from "@daily-co/daily-react";
import {
	MessageSquare,
	Mic,
	MicOff,
	PhoneOff,
	Video,
	VideoOff,
} from "lucide-react";

interface CallControlsProps {
	showPanel: boolean;
	onTogglePanel: () => void;
}

export function CallControls({ showPanel, onTogglePanel }: CallControlsProps) {
	const daily = useDaily();
	const localSessionId = useLocalSessionId();
	const audioState = useParticipantProperty(localSessionId, "tracks.audio.state");
	const videoState = useParticipantProperty(localSessionId, "tracks.video.state");
	const isMicOn = audioState === "playable" || audioState === "sendable";
	const isCamOn = videoState === "playable" || videoState === "sendable";

	const toggleMic = () => daily?.setLocalAudio(!isMicOn);
	const toggleCam = () => daily?.setLocalVideo(!isCamOn);
	const leave = () => {
		daily?.leave();
		daily?.destroy();
		window.location.href = "/";
	};

	return (
		<div className="flex items-center justify-center gap-2 border-t border-border px-4 py-3">
			<Button
				variant={isMicOn ? "secondary" : "destructive"}
				size="icon"
				className="rounded-full h-12 w-12"
				onClick={toggleMic}
				title={isMicOn ? "Mute" : "Unmute"}
			>
				{isMicOn ? (
					<Mic className="h-5 w-5" />
				) : (
					<MicOff className="h-5 w-5" />
				)}
			</Button>

			<Button
				variant={isCamOn ? "secondary" : "destructive"}
				size="icon"
				className="rounded-full h-12 w-12"
				onClick={toggleCam}
				title={isCamOn ? "Turn off camera" : "Turn on camera"}
			>
				{isCamOn ? (
					<Video className="h-5 w-5" />
				) : (
					<VideoOff className="h-5 w-5" />
				)}
			</Button>

			<Button
				variant="destructive"
				size="icon"
				className="rounded-full h-12 w-12"
				onClick={leave}
				title="Leave call"
			>
				<PhoneOff className="h-5 w-5" />
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
		</div>
	);
}
