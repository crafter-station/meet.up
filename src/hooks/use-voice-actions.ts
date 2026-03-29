"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 10_000;
// Trigger keywords (longer first to avoid partial matches):
// "meetup ai", "ai assistant", "asistente ia", "asistente", "ai", "ia"
const KEYWORD_PATTERN =
	/(?:meet\s*up\s+ai|ai\s+assistant|asistente\s+(?:de\s+)?ia|\basistente\b|\bai\b|\bia\b)[.,;:!]?\s+(.*)/i;

export interface PendingVoiceAction {
	command: string;
	proposal: string;
}

export function useVoiceActions({
	transcriptText,
	roomId,
	enabled,
	onExecuted,
}: {
	transcriptText: string;
	roomId: string;
	enabled: boolean;
	onExecuted?: (summary: string) => void;
}) {
	const lastLengthRef = useRef(0);
	const processingRef = useRef(false);
	const transcriptRef = useRef(transcriptText);
	transcriptRef.current = transcriptText;

	const [pendingAction, setPendingAction] = useState<PendingVoiceAction | null>(
		null,
	);
	const [executing, setExecuting] = useState(false);

	const processChunk = useCallback(async () => {
		if (processingRef.current || pendingAction) return;

		const currentText = transcriptRef.current;
		const delta = currentText.slice(lastLengthRef.current);

		if (!delta.trim()) return;

		// Always advance the cursor so we don't reprocess old text
		const previousLength = lastLengthRef.current;
		lastLengthRef.current = currentText.length;

		// Check for keyword in delta
		const match = delta.match(KEYWORD_PATTERN);
		if (!match || !match[1]?.trim()) return;

		const command = match[1].trim();
		processingRef.current = true;

		try {
			const res = await fetch(`/api/r/${roomId}/voice-actions`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ command, mode: "detect" }),
			});

			if (!res.ok) {
				lastLengthRef.current = previousLength;
				return;
			}

			const data = await res.json();

			if (data.proposal) {
				setPendingAction({ command, proposal: data.proposal });
			}
		} catch {
			lastLengthRef.current = previousLength;
		} finally {
			processingRef.current = false;
		}
	}, [roomId, pendingAction]);

	const acceptAction = useCallback(async () => {
		if (!pendingAction) return;
		setExecuting(true);

		try {
			const res = await fetch(`/api/r/${roomId}/voice-actions`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					command: pendingAction.command,
					mode: "execute",
				}),
			});

			if (res.ok) {
				const data = await res.json();
				onExecuted?.(
					data.summary && data.summary !== "Action executed"
						? data.summary
						: pendingAction.proposal,
				);
			}
		} catch {
			// silently fail — the proposal card already dismissed
		} finally {
			setPendingAction(null);
			setExecuting(false);
		}
	}, [roomId, pendingAction, onExecuted]);

	const rejectAction = useCallback(() => {
		setPendingAction(null);
	}, []);

	useEffect(() => {
		if (!enabled) return;

		const interval = setInterval(() => {
			void processChunk();
		}, POLL_INTERVAL_MS);

		return () => clearInterval(interval);
	}, [enabled, processChunk]);

	return { pendingAction, executing, acceptAction, rejectAction };
}
