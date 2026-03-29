"use client";

import { useAdmission } from "@/hooks/use-admission";
import { useRealtimeChat } from "@/hooks/use-realtime-chat";
import { useTranscription } from "@/hooks/use-transcription";
import { useVoiceActions } from "@/hooks/use-voice-actions";
import { Button } from "@/components/ui/button";
import {
	DailyAudio,
	useActiveSpeakerId,
	useParticipantIds,
} from "@daily-co/daily-react";
import { Check, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CallControls } from "./call-controls";
import { MeetingFeed } from "./meeting-feed";
import { ParticipantTile } from "./participant-tile";
import { TranscriptionOverlay } from "./transcription-overlay";

interface CallUIProps {
	username: string;
	roomId: string;
	isOwner: boolean;
	ownerSecret: string | null;
	onLeaveCall: () => void;
	onOwnershipReceived: (secret: string) => void;
}

export function CallUI({
	username,
	roomId,
	isOwner,
	ownerSecret,
	onLeaveCall,
	onOwnershipReceived,
}: CallUIProps) {
	const participantIds = useParticipantIds();
	const activeSpeakerId = useActiveSpeakerId();
	const [showPanel, setShowPanel] = useState(true);
	const [mobileTranscriptionOpen, setMobileTranscriptionOpen] = useState(true);
	const [voiceActionsEnabled, setVoiceActionsEnabled] = useState(true);

	// Keep screen awake during the call
	useEffect(() => {
		let wakeLock: WakeLockSentinel | null = null;

		const acquire = async () => {
			try {
				wakeLock = await navigator.wakeLock.request("screen");
			} catch {
				console.warn("Wake Lock API not supported or permission denied");
			}
		};

		acquire();

		// Re-acquire when tab becomes visible again (browser releases it on hide)
		const onVisibilityChange = () => {
			if (document.visibilityState === "visible") acquire();
		};
		document.addEventListener("visibilitychange", onVisibilityChange);

		return () => {
			wakeLock?.release();
			document.removeEventListener("visibilitychange", onVisibilityChange);
		};
	}, []);

	const onMeetingEnded = useCallback(() => {
		window.location.href = `/summary/${roomId}`;
	}, [roomId]);

	const {
		messages,
		feedItems,
		partialTexts,
		send,
		sendAs,
		addTranscript,
		addFeedItem,
		updateFeedItem,
		broadcastPartial,
		broadcastMeetingEnded,
	} = useRealtimeChat(roomId, username, { onMeetingEnded });

	const { partialText, isActive, isListening, start, stop } = useTranscription({
		username,
		onTranscript: addTranscript,
		onPartial: broadcastPartial,
	});

	// Auto-start transcription for everyone when joining the call
	const autoStartedRef = useRef(false);
	useEffect(() => {
		if (autoStartedRef.current) return;
		autoStartedRef.current = true;
		start();
	}, [start]);

	const { pendingRequests, acceptUser, rejectUser, broadcastOwnershipTransfer } =
		useAdmission({
			roomId,
			username,
			isOwner,
			onOwnershipReceived,
		});

	// Fetch voice actions setting on mount
	useEffect(() => {
		fetch(`/api/r/${roomId}/settings`)
			.then((res) => res.json())
			.then((data) => {
				if (data.voiceActionsEnabled !== undefined)
					setVoiceActionsEnabled(data.voiceActionsEnabled);
			})
			.catch(() => {});
	}, [roomId]);

	// Build transcript text for voice actions
	const transcriptText = useMemo(() => {
		const msgs = messages.filter((m) => m.type === "transcript");
		return msgs.map((m) => `${m.username}: ${m.content}`).join("\n");
	}, [messages]);

	const onVoiceActionExecuted = useCallback(
		(summary: string) => void sendAs(summary, "meet.up AI"),
		[sendAs],
	);

	const { pendingAction, executing, acceptAction, rejectAction } =
		useVoiceActions({
			transcriptText,
			roomId,
			enabled: voiceActionsEnabled,
			onExecuted: onVoiceActionExecuted,
		});

	// Merge local partial with remote partials
	const allPartials: Record<string, string> = { ...partialTexts };
	if (partialText) {
		allPartials[username] = partialText;
	}
	const mobileTranscriptionStatus: "off" | "waiting" | "talking" = !isActive
		? "off"
		: isListening
			? "talking"
			: "waiting";

	return (
		<div className="flex h-full w-full flex-col">
			<DailyAudio />
			<div className="relative flex flex-1 overflow-hidden">
				{/* Voice action proposal */}
				{pendingAction && (
					<div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
						<div className="rounded-lg border border-primary/30 bg-background p-4 shadow-2xl">
							<p className="text-xs font-semibold text-primary mb-1">
								Voice Action Detected
							</p>
							<p className="text-sm text-foreground mb-3">
								{pendingAction.proposal}
							</p>
							<div className="flex gap-2 justify-end">
								<Button
									size="sm"
									variant="outline"
									onClick={rejectAction}
									disabled={executing}
								>
									<X className="h-4 w-4 mr-1" />
									Reject
								</Button>
								<Button
									size="sm"
									onClick={() => void acceptAction()}
									disabled={executing}
								>
									{executing ? (
										<Loader2 className="h-4 w-4 mr-1 animate-spin" />
									) : (
										<Check className="h-4 w-4 mr-1" />
									)}
									Accept
								</Button>
							</div>
						</div>
					</div>
				)}

				{/* Video Grid */}
				<div className="flex-1 p-3">
					<div
						className={`grid h-full gap-3 ${getGridClass(participantIds.length)}`}
					>
						{participantIds.map((id) => (
							<ParticipantTile
								key={id}
								participantId={id}
								isActiveSpeaker={id === activeSpeakerId}
							/>
						))}
					</div>
				</div>
				<TranscriptionOverlay
					username={username}
					roomId={roomId}
					partialTexts={allPartials}
					messages={messages}
					mobileOpen={mobileTranscriptionOpen}
					onMobileOpenChange={setMobileTranscriptionOpen}
					isOwner={isOwner}
					transcription={{ isActive, isListening, start, stop }}
					onPinToFeed={async (content, _title, metadata) => {
						const itemId = await addFeedItem({ type: "artifact", content, title: "", metadata });
						if (!itemId) return;
						try {
							const res = await fetch("/api/generate-title", {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({ content }),
							});
							const { title: generated } = await res.json();
							updateFeedItem(itemId, { title: generated });
						} catch {
							updateFeedItem(itemId, { title: content.slice(0, 50) });
						}
					}}
				/>

				{/* Side Panel — overlay on mobile, sidebar on desktop */}
				{showPanel && (
					<div className="absolute inset-0 z-10 flex flex-col bg-background md:static md:inset-auto md:z-auto md:w-80 md:border-l md:border-border">
						<MeetingFeed
							messages={messages}
							feedItems={feedItems}
							onSendChat={send}
							onAddFeedItem={addFeedItem}
							onUpdateFeedItem={updateFeedItem}
							username={username}
						/>
					</div>
				)}
			</div>

			<CallControls
				showPanel={showPanel}
				onTogglePanel={() => setShowPanel(!showPanel)}
				showMobileTranscription={mobileTranscriptionOpen}
				onToggleMobileTranscription={() =>
					setMobileTranscriptionOpen((prev) => !prev)
				}
				mobileTranscriptionStatus={mobileTranscriptionStatus}
				roomId={roomId}
				onMeetingEnded={broadcastMeetingEnded}
				isOwner={isOwner}
				ownerSecret={ownerSecret}
				pendingRequests={pendingRequests}
				onAcceptUser={acceptUser}
				onRejectUser={rejectUser}
				onLeaveCall={onLeaveCall}
				onBroadcastOwnershipTransfer={broadcastOwnershipTransfer}
			voiceActionsEnabled={voiceActionsEnabled}
			onVoiceActionsChange={setVoiceActionsEnabled}
			/>
		</div>
	);
}

function getGridClass(count: number): string {
	if (count <= 1) return "grid-cols-1";
	if (count <= 4) return "grid-cols-1 md:grid-cols-2";
	if (count <= 9) return "grid-cols-2 md:grid-cols-3";
	return "grid-cols-2 md:grid-cols-4";
}
