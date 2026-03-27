"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	DailyVideo,
	useAudioLevelObserver,
	useParticipantProperty,
} from "@daily-co/daily-react";
import { MicOff } from "lucide-react";
import { useCallback, useState } from "react";

interface ParticipantTileProps {
	participantId: string;
	isActiveSpeaker?: boolean;
}

export function ParticipantTile({
	participantId,
	isActiveSpeaker = false,
}: ParticipantTileProps) {
	const [audioLevel, setAudioLevel] = useState(0);
	const userName = useParticipantProperty(participantId, "user_name");
	const isLocal = useParticipantProperty(participantId, "local");
	const audioState = useParticipantProperty(participantId, "tracks.audio.state");
	const videoState = useParticipantProperty(participantId, "tracks.video.state");
	const onAudioLevelChange = useCallback((level: number) => {
		setAudioLevel(level);
	}, []);
	useAudioLevelObserver(participantId, onAudioLevelChange);

	const name = (userName as string) || "Guest";
	const initials = name.slice(0, 2).toUpperCase();
	const hasVideo = videoState === "playable" || videoState === "sendable";
	const hasAudio = audioState === "playable" || audioState === "sendable";
	const normalizedLevel = Math.max(0, Math.min(1, audioLevel || 0));
	const highlightStrength = isActiveSpeaker ? 0.28 + normalizedLevel * 0.42 : 0;
	const pulseScale = isActiveSpeaker ? 1 + normalizedLevel * 0.025 : 1;

	return (
		<div
			className={`relative flex items-center justify-center overflow-hidden rounded-xl border-2 bg-muted transition-all duration-200 ${
				isActiveSpeaker
					? "border-primary"
					: "border-transparent"
			}`}
			style={{
				transform: `scale(${pulseScale})`,
				boxShadow: isActiveSpeaker
					? `0 0 0 2px hsl(var(--primary) / ${highlightStrength})`
					: undefined,
			}}
		>
			<div
				className={`pointer-events-none absolute inset-0 rounded-xl transition-opacity duration-200 ${
					isActiveSpeaker ? "opacity-100" : "opacity-0"
				}`}
				style={{
					boxShadow: isActiveSpeaker
						? `inset 0 0 0 1px hsl(var(--primary) / ${0.35 + normalizedLevel * 0.4})`
						: undefined,
				}}
			/>
			{hasVideo ? (
				<DailyVideo
					automirror
					sessionId={participantId}
					type="video"
					className="h-full w-full object-cover"
				/>
			) : (
				<Avatar className="h-20 w-20">
					<AvatarFallback className="text-2xl bg-primary text-primary-foreground">
						{initials}
					</AvatarFallback>
				</Avatar>
			)}

			<div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-background/80 px-2.5 py-1 text-sm backdrop-blur-sm">
				{!hasAudio && (
					<MicOff className="h-3.5 w-3.5 text-destructive" />
				)}
				<span className="text-foreground">
					{isLocal ? `${name} (You)` : name}
				</span>
			</div>
		</div>
	);
}
