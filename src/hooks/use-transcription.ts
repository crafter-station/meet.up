"use client";

import type { ChatMessage } from "@/components/video-call/types";
import { useScribe } from "@elevenlabs/react";
import {
	useLocalSessionId,
	useParticipantProperty,
} from "@daily-co/daily-react";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseTranscriptionOptions {
	username: string;
	onTranscript: (entry: ChatMessage) => void;
	onPartial: (text: string) => void;
}

export function useTranscription({
	username,
	onTranscript,
	onPartial,
}: UseTranscriptionOptions) {
	const localSessionId = useLocalSessionId();
	const audioOff = useParticipantProperty(localSessionId, "tracks.audio.off");
	const audioState = useParticipantProperty(
		localSessionId,
		"tracks.audio.state",
	);

	// Reactive mute signal straight from Daily's participant state.
	const isMuted =
		typeof audioOff === "boolean"
			? audioOff
			: audioState !== "playable" && audioState !== "sendable";

	const [enabled, setEnabled] = useState(false);
	const lastCommitCountRef = useRef(0);
	const onTranscriptRef = useRef(onTranscript);
	const onPartialRef = useRef(onPartial);
	useEffect(() => {
		onTranscriptRef.current = onTranscript;
		onPartialRef.current = onPartial;
	}, [onTranscript, onPartial]);

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

	// Connect/disconnect Scribe based on enabled + mute state.
	useEffect(() => {
		if (!enabled) return;

		if (isMuted) {
			scribe.disconnect();
			onPartialRef.current("");
		} else {
			void connectScribe();
		}
	}, [isMuted, enabled, scribe, connectScribe]);

	// Watch for new committed transcripts and push them to chat feed.
	useEffect(() => {
		if (!enabled) return;
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

		onPartialRef.current("");
	}, [enabled, scribe.committedTranscripts, username]);

	// Broadcast partial text changes to all participants.
	useEffect(() => {
		if (!enabled) return;
		onPartialRef.current(scribe.partialTranscript);
	}, [enabled, scribe.partialTranscript]);

	const start = useCallback(async () => {
		setEnabled(true);
		lastCommitCountRef.current = scribe.committedTranscripts.length;
		if (!isMuted) {
			await connectScribe();
		}
	}, [isMuted, connectScribe, scribe]);

	const stop = useCallback(() => {
		setEnabled(false);
		scribe.disconnect();
		lastCommitCountRef.current = scribe.committedTranscripts.length;
		onPartialRef.current("");
	}, [scribe]);

	return {
		partialText: enabled ? scribe.partialTranscript : "",
		isActive: enabled,
		isListening: enabled && !isMuted && scribe.isConnected,
		start,
		stop,
	};
}
