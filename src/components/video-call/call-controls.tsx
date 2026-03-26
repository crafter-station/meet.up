"use client";

import { endMeeting } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
	useDaily,
	useLocalSessionId,
	useParticipantProperty,
} from "@daily-co/daily-react";
import {
	Loader2,
	MessageSquare,
	Mic,
	MicOff,
	PhoneOff,
	Square,
	Video,
	VideoOff,
} from "lucide-react";
import { useState } from "react";

interface CallControlsProps {
	showPanel: boolean;
	onTogglePanel: () => void;
	roomId: string;
	onMeetingEnded: () => void;
}

export function CallControls({
	showPanel,
	onTogglePanel,
	roomId,
	onMeetingEnded,
}: CallControlsProps) {
	const daily = useDaily();
	const localSessionId = useLocalSessionId();
	const audioState = useParticipantProperty(localSessionId, "tracks.audio.state");
	const videoState = useParticipantProperty(localSessionId, "tracks.video.state");
	const isMicOn = audioState === "playable" || audioState === "sendable";
	const isCamOn = videoState === "playable" || videoState === "sendable";
	const [ending, setEnding] = useState(false);

	const toggleMic = () => daily?.setLocalAudio(!isMicOn);
	const toggleCam = () => daily?.setLocalVideo(!isCamOn);

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
		</div>
	);
}
