"use client";

import type { ChatMessage } from "@/components/video-call/types";
import { useScribe } from "@elevenlabs/react";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseTranscriptionOptions {
	username: string;
	muted: boolean;
	onTranscript: (entry: ChatMessage) => void;
	onPartial: (text: string) => void;
}

export function useTranscription({
	username,
	muted,
	onTranscript,
	onPartial,
}: UseTranscriptionOptions) {
	const [enabled, setEnabled] = useState(false);
	const lastCommitCountRef = useRef(0);
	const onTranscriptRef = useRef(onTranscript);
	onTranscriptRef.current = onTranscript;
	const onPartialRef = useRef(onPartial);
	onPartialRef.current = onPartial;

	const scribe = useScribe({
		modelId: "scribe_v2_realtime",
		onError: (err) => console.error("Scribe error:", err),
	});

	const connectScribe = useCallback(async () => {
		const res = await fetch("/api/elevenlabs/token");
		if (!res.ok) {
			console.error("Failed to get ElevenLabs token");
			return;
		}
		const data = await res.json();
		if (!data.token) {
			console.error("No token in response");
			return;
		}
		await scribe.connect({
			token: data.token,
			microphone: {
				echoCancellation: true,
				noiseSuppression: true,
				autoGainControl: true,
			},
		});
	}, [scribe]);

	// Handle mute: disconnect scribe when muted, reconnect when unmuted
	useEffect(() => {
		if (!enabled) return;

		if (muted) {
			scribe.disconnect();
		} else {
			connectScribe();
		}
	}, [muted, enabled, scribe, connectScribe]);

	// Watch for new committed transcripts and push them to chat feed
	useEffect(() => {
		const committed = scribe.committedTranscripts;
		if (committed.length <= lastCommitCountRef.current) return;

		const newTranscripts = committed.slice(lastCommitCountRef.current);
		lastCommitCountRef.current = committed.length;

		for (const segment of newTranscripts) {
			if (!segment.text.trim()) continue;

			onTranscriptRef.current({
				id: nanoid(),
				username,
				content: segment.text.trim(),
				timestamp: Date.now(),
				type: "transcript",
			});
		}

		// Clear partial after commit
		onPartialRef.current("");
	}, [scribe.committedTranscripts, username]);

	// Broadcast partial text changes to all participants
	useEffect(() => {
		onPartialRef.current(scribe.partialTranscript);
	}, [scribe.partialTranscript]);

	const start = useCallback(async () => {
		setEnabled(true);
		if (!muted) {
			await connectScribe();
		}
	}, [muted, connectScribe]);

	const stop = useCallback(() => {
		setEnabled(false);
		scribe.disconnect();
		lastCommitCountRef.current = 0;
		onPartialRef.current("");
	}, [scribe]);

	return {
		partialText: scribe.partialTranscript,
		isActive: enabled,
		isListening: scribe.isConnected,
		start,
		stop,
	};
}
