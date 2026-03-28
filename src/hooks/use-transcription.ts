"use client";

import type { ChatMessage } from "@/components/video-call/types";
import { useScribe } from "@elevenlabs/react";
import {
	useLocalSessionId,
	useParticipantProperty,
} from "@daily-co/daily-react";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";

const MAX_CHUNK_LENGTH = 200;

/**
 * Split text into sentence-based chunks at ". " boundaries.
 * Avoids splitting decimals (e.g. "3.5") since those lack a trailing space.
 * Long sentences are hard-split at word boundaries.
 */
function splitIntoChunks(text: string): string[] {
	const parts = text.split(/\.\s+/);
	const chunks: string[] = [];

	for (let i = 0; i < parts.length; i++) {
		let part = parts[i].trim();
		if (!part) continue;

		// The split consumed the ". " — re-add the period for all but the last part
		if (i < parts.length - 1) {
			part += ".";
		}

		if (part.length <= MAX_CHUNK_LENGTH) {
			chunks.push(part);
		} else {
			let remaining = part;
			while (remaining.length > MAX_CHUNK_LENGTH) {
				let splitIdx = remaining.lastIndexOf(" ", MAX_CHUNK_LENGTH);
				if (splitIdx <= 0) splitIdx = MAX_CHUNK_LENGTH;
				chunks.push(remaining.slice(0, splitIdx).trim());
				remaining = remaining.slice(splitIdx).trim();
			}
			if (remaining) chunks.push(remaining);
		}
	}

	return chunks.length > 0 ? chunks : [text.trim()];
}

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

	const isMuted =
		typeof audioOff === "boolean"
			? audioOff
			: audioState !== "playable" && audioState !== "sendable";

	const [enabled, setEnabled] = useState(false);
	const [displayPartial, setDisplayPartial] = useState("");
	const displayPartialRef = useRef("");
	const onTranscriptRef = useRef(onTranscript);
	const onPartialRef = useRef(onPartial);
	useEffect(() => {
		onTranscriptRef.current = onTranscript;
		onPartialRef.current = onPartial;
	}, [onTranscript, onPartial]);

	// Set of already-emitted sentence content — prevents duplicate messages
	// across period detection, SDK commits, and mute/unmute cycles.
	// Never cleared during the call so no message is ever lost or doubled.
	const emittedRef = useRef(new Set<string>());

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

	// Emit helper — splits text into chunks, deduplicates via emittedRef,
	// and calls onTranscript for each genuinely new chunk.
	const emitChunks = useCallback(
		(text: string) => {
			const chunks = splitIntoChunks(text);
			for (const chunk of chunks) {
				if (emittedRef.current.has(chunk)) continue;
				emittedRef.current.add(chunk);
				onTranscriptRef.current({
					id: nanoid(),
					username,
					content: chunk,
					timestamp: Date.now(),
					type: "transcript",
				});
			}
		},
		[username],
	);

	// Connect/disconnect Scribe based on enabled + mute state.
	// On mute: force-commit any remaining partial text so it's never lost.
	useEffect(() => {
		if (!enabled) return;

		if (isMuted) {
			const remaining = displayPartialRef.current.trim();
			if (remaining) emitChunks(remaining);
			scribe.disconnect();
			displayPartialRef.current = "";
			setDisplayPartial("");
			onPartialRef.current("");
		} else {
			void connectScribe();
		}
	}, [isMuted, enabled, scribe, connectScribe, emitChunks]);

	// Watch partial text for sentence boundaries (period detection).
	// Complete sentences are emitted immediately so they are "locked in"
	// and can never be overwritten or lost by later SDK updates.
	useEffect(() => {
		if (!enabled) return;
		const partial = scribe.partialTranscript;
		if (!partial) {
			displayPartialRef.current = "";
			setDisplayPartial("");
			onPartialRef.current("");
			return;
		}

		// Find the last sentence boundary: ". " or trailing "."
		let splitAt = -1;
		const lastPeriodSpace = partial.lastIndexOf(". ");
		if (lastPeriodSpace !== -1) splitAt = lastPeriodSpace + 1;
		if (partial.endsWith(".")) splitAt = partial.length;

		if (splitAt === -1) {
			// No complete sentence yet — show the full partial
			displayPartialRef.current = partial;
			setDisplayPartial(partial);
			onPartialRef.current(partial);
			return;
		}

		const completePart = partial.slice(0, splitAt).trim();
		const tail = partial.slice(splitAt).trim();

		if (completePart) emitChunks(completePart);

		// Only the incomplete tail remains as the live partial
		displayPartialRef.current = tail;
		setDisplayPartial(tail);
		onPartialRef.current(tail);
	}, [enabled, scribe.partialTranscript, emitChunks]);

	// Handle SDK committed transcripts as a safety net.
	// Most sentences will already have been emitted via period detection;
	// the emittedRef Set deduplicates so nothing is doubled.
	useEffect(() => {
		if (!enabled) return;
		for (const segment of scribe.committedTranscripts) {
			if (!segment.text.trim()) continue;
			emitChunks(segment.text.trim());
		}
	}, [enabled, scribe.committedTranscripts, emitChunks]);

	const start = useCallback(async () => {
		setEnabled(true);
		if (!isMuted) {
			await connectScribe();
		}
	}, [isMuted, connectScribe]);

	const stop = useCallback(() => {
		setEnabled(false);
		scribe.disconnect();
		displayPartialRef.current = "";
		setDisplayPartial("");
		onPartialRef.current("");
	}, [scribe]);

	return {
		partialText: enabled ? displayPartial : "",
		isActive: enabled,
		isListening: enabled && !isMuted && scribe.isConnected,
		start,
		stop,
	};
}
