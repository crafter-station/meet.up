"use client";

import { notify } from "@/lib/notify";
import { useCallback, useEffect, useRef } from "react";

const POLL_INTERVAL_MS = 10_000;

const TOOL_LABELS: Record<string, string> = {
	scheduleNewMeeting: "Meeting Scheduled",
	getCurrentTime: "Time Retrieved",
	getCurrentMeetingCode: "Meeting Code Retrieved",
	getMeetingParticipantEmails: "Emails Retrieved",
	createCalendarEvent: "Calendar Event Created",
	updateCalendarEvent: "Calendar Event Updated",
	deleteCalendarEvent: "Calendar Event Deleted",
	listCalendarEvents: "Calendar Events Listed",
	searchCalendarEvents: "Calendar Events Searched",
};

interface VoiceActionsResponse {
	actions: Array<{ tool: string; description: string; result: unknown }>;
	summary?: string;
}

export function useVoiceActions({
	transcriptText,
	roomId,
	enabled,
}: {
	transcriptText: string;
	roomId: string;
	enabled: boolean;
}) {
	const lastLengthRef = useRef(0);
	const processingRef = useRef(false);
	const transcriptRef = useRef(transcriptText);
	transcriptRef.current = transcriptText;

	const processChunk = useCallback(async () => {
		if (processingRef.current) return;

		const currentText = transcriptRef.current;
		const delta = currentText.slice(lastLengthRef.current);

		if (!delta.trim()) return;

		const previousLength = lastLengthRef.current;
		lastLengthRef.current = currentText.length;
		processingRef.current = true;

		try {
			const res = await fetch(`/api/r/${roomId}/voice-actions`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ transcript: delta }),
			});

			if (!res.ok) {
				lastLengthRef.current = previousLength;
				return;
			}

			const data: VoiceActionsResponse = await res.json();

			if (data.actions && data.actions.length > 0) {
				if (data.summary) {
					notify("success", {
						title: "Voice Action",
						description: data.summary,
					});
				} else {
					for (const action of data.actions) {
						const label = TOOL_LABELS[action.tool] ?? action.tool;
						notify("info", { title: `Voice Action: ${label}` });
					}
				}
			}
		} catch {
			lastLengthRef.current = previousLength;
		} finally {
			processingRef.current = false;
		}
	}, [roomId]);

	useEffect(() => {
		if (!enabled) return;

		const interval = setInterval(() => {
			void processChunk();
		}, POLL_INTERVAL_MS);

		return () => clearInterval(interval);
	}, [enabled, processChunk]);
}
