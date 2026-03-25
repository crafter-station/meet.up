"use client";

import { useRealtimeChat } from "@/hooks/use-realtime-chat";
import { useTranscription } from "@/hooks/use-transcription";
import {
	DailyAudio,
	useLocalSessionId,
	useParticipantIds,
	useParticipantProperty,
} from "@daily-co/daily-react";
import { useState } from "react";
import { CallControls } from "./call-controls";
import { ChatPanel } from "./chat-panel";
import { ParticipantTile } from "./participant-tile";

interface CallUIProps {
	username: string;
	roomId: string;
}

export function CallUI({ username, roomId }: CallUIProps) {
	const participantIds = useParticipantIds();
	const localSessionId = useLocalSessionId();
	const audioState = useParticipantProperty(localSessionId, "tracks.audio.state");
	const isMuted = audioState !== "playable" && audioState !== "sendable";
	const [showPanel, setShowPanel] = useState(true);

	const { messages, partialTexts, send, addTranscript, broadcastPartial } =
		useRealtimeChat(roomId, username);

	const { partialText, isActive, isListening, start, stop } = useTranscription({
		username,
		muted: isMuted,
		onTranscript: addTranscript,
		onPartial: broadcastPartial,
	});

	// Merge local partial with remote partials
	const allPartials: Record<string, string> = { ...partialTexts };
	if (partialText) {
		allPartials[username] = partialText;
	}

	return (
		<div className="flex h-full w-full flex-col">
			<DailyAudio />
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

				{/* Side Panel — unified chat + transcription */}
				{showPanel && (
					<div className="w-80 border-l border-border flex flex-col">
						<ChatPanel
							messages={messages}
							onSend={send}
							username={username}
							partialTexts={allPartials}
							transcription={{ isActive, isListening, start, stop }}
						/>
					</div>
				)}
			</div>

			<CallControls
				showPanel={showPanel}
				onTogglePanel={() => setShowPanel(!showPanel)}
			/>
		</div>
	);
}

function getGridClass(count: number): string {
	if (count <= 1) return "grid-cols-1";
	if (count <= 4) return "grid-cols-2";
	if (count <= 9) return "grid-cols-3";
	return "grid-cols-4";
}
