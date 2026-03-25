"use client";

import { useParticipantIds } from "@daily-co/daily-react";
import { useState } from "react";
import { CallControls } from "./call-controls";
import { ChatPanel } from "./chat-panel";
import { ParticipantTile } from "./participant-tile";
import { TranscriptPanel } from "./transcript-panel";

interface CallUIProps {
	username: string;
	roomId: string;
}

export function CallUI({ username, roomId }: CallUIProps) {
	const participantIds = useParticipantIds();
	const [activePanel, setActivePanel] = useState<
		"chat" | "transcript" | null
	>("chat");

	return (
		<div className="flex h-full w-full flex-col">
			<div className="flex flex-1 overflow-hidden">
				{/* Video Grid */}
				<div className="flex-1 p-3">
					<div
						className={`grid h-full gap-3 ${getGridClass(participantIds.length)}`}
					>
						{participantIds.map((id) => (
							<ParticipantTile key={id} participantId={id} />
						))}
					</div>
				</div>

				{/* Side Panel */}
				{activePanel && (
					<div className="w-80 border-l border-border flex flex-col">
						{activePanel === "chat" ? (
							<ChatPanel roomId={roomId} username={username} />
						) : (
							<TranscriptPanel />
						)}
					</div>
				)}
			</div>

			<CallControls activePanel={activePanel} onTogglePanel={setActivePanel} />
		</div>
	);
}

function getGridClass(count: number): string {
	if (count <= 1) return "grid-cols-1";
	if (count <= 4) return "grid-cols-2";
	if (count <= 9) return "grid-cols-3";
	return "grid-cols-4";
}
