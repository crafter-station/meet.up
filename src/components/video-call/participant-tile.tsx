"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DailyVideo, useParticipantProperty } from "@daily-co/daily-react";
import { MicOff } from "lucide-react";

interface ParticipantTileProps {
	participantId: string;
}

export function ParticipantTile({ participantId }: ParticipantTileProps) {
	const userName = useParticipantProperty(participantId, "user_name");
	const isLocal = useParticipantProperty(participantId, "local");
	const audioState = useParticipantProperty(participantId, "tracks.audio.state");
	const videoState = useParticipantProperty(participantId, "tracks.video.state");

	const name = (userName as string) || "Guest";
	const initials = name.slice(0, 2).toUpperCase();
	const hasVideo = videoState === "playable" || videoState === "sendable";
	const hasAudio = audioState === "playable" || audioState === "sendable";

	return (
		<div className="relative flex items-center justify-center overflow-hidden rounded-xl bg-muted">
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
