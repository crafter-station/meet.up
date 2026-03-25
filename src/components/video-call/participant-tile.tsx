"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DailyVideo, useParticipant } from "@daily-co/daily-react";
import { MicOff } from "lucide-react";

interface ParticipantTileProps {
	participantId: string;
}

export function ParticipantTile({ participantId }: ParticipantTileProps) {
	const participant = useParticipant(participantId);

	if (!participant) return null;

	const name = participant.user_name || "Guest";
	const initials = name.slice(0, 2).toUpperCase();
	const isLocal = participant.local;

	return (
		<div className="relative flex items-center justify-center overflow-hidden rounded-xl bg-muted">
			{participant.video ? (
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
				{!participant.audio && (
					<MicOff className="h-3.5 w-3.5 text-destructive" />
				)}
				<span className="text-foreground">
					{isLocal ? `${name} (You)` : name}
				</span>
			</div>
		</div>
	);
}
