"use client";

import { endMeeting } from "@/app/actions";
import { CamToggle, MicToggle } from "@/components/media-toggles";
import { Button } from "@/components/ui/button";
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
	Square,
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

	const { cameras, microphones, currentCam, currentMic, setCamera, setMicrophone } = useDevices();

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
		</div>
	);
}
