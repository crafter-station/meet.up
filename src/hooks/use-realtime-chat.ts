"use client";

import { getMessages, saveTranscript, sendMessage } from "@/app/actions";
import type { ChatMessage } from "@/components/video-call/types";
import { getSupabaseClient } from "@/lib/supabase";
import { useCallback, useEffect, useRef, useState } from "react";

type ChatEvent =
	| { type: "message:add"; message: ChatMessage }
	| { type: "messages:sync"; messages: ChatMessage[] }
	| { type: "partial:update"; text: string; speaker: string }
	| { type: "meeting:ended" };

interface UseRealtimeChatOptions {
	onMeetingEnded?: () => void;
}

export function useRealtimeChat(
	roomId: string,
	username: string,
	options?: UseRealtimeChatOptions,
) {
	const onMeetingEndedRef = useRef(options?.onMeetingEnded);
	onMeetingEndedRef.current = options?.onMeetingEnded;
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [partialTexts, setPartialTexts] = useState<
		Record<string, string>
	>({});
	const channelRef = useRef<ReturnType<
		ReturnType<typeof getSupabaseClient>["channel"]
	> | null>(null);
	const messagesRef = useRef(messages);
	messagesRef.current = messages;

	// Load existing chat messages on mount
	useEffect(() => {
		getMessages(roomId).then(({ messages: existing }) => {
			setMessages(existing);
		});
	}, [roomId]);

	// Set up realtime channel
	useEffect(() => {
		const supabase = getSupabaseClient();
		const channel = supabase.channel(`room:${roomId}`);

		channel
			.on("presence", { event: "join" }, () => {
				if (messagesRef.current.length > 0) {
					channel.send({
						type: "broadcast",
						event: "chat-event",
						payload: {
							type: "messages:sync",
							messages: messagesRef.current,
							username,
						} satisfies ChatEvent & { username: string },
					});
				}
			})
			.on(
				"broadcast",
				{ event: "chat-event" },
				({
					payload,
				}: { payload: ChatEvent & { username: string } }) => {
					if (payload.username === username) return;

					switch (payload.type) {
						case "message:add":
							setMessages((prev) => [...prev, payload.message]);
							// Clear partial text for this speaker when they commit
							if (payload.message.type === "transcript") {
								setPartialTexts((prev) => {
									const next = { ...prev };
									delete next[payload.message.username];
									return next;
								});
							}
							break;
						case "messages:sync":
							setMessages((prev) => {
								const existingIds = new Set(prev.map((m) => m.id));
								const newMessages = payload.messages.filter(
									(m) => !existingIds.has(m.id),
								);
								return [...prev, ...newMessages];
							});
							break;
						case "partial:update":
							setPartialTexts((prev) =>
								payload.text
									? { ...prev, [payload.speaker]: payload.text }
									: (() => {
											const next = { ...prev };
											delete next[payload.speaker];
											return next;
										})(),
							);
							break;
						case "meeting:ended":
							onMeetingEndedRef.current?.();
							break;
					}
				},
			)
			.subscribe(async (status) => {
				if (status === "SUBSCRIBED") {
					await channel.track({ username });
					channelRef.current = channel;
				}
			});

		return () => {
			supabase.removeChannel(channel);
			channelRef.current = null;
		};
	}, [roomId, username]);

	const send = useCallback(
		async (content: string) => {
			const { message, error } = await sendMessage(roomId, username, content);
			if (error || !message) return;

			const chatMsg: ChatMessage = { ...message, type: "chat" };

			setMessages((prev) => [...prev, chatMsg]);

			channelRef.current?.send({
				type: "broadcast",
				event: "chat-event",
				payload: {
					type: "message:add",
					message: chatMsg,
					username,
				} satisfies ChatEvent & { username: string },
			});
		},
		[roomId, username],
	);

	const sendAs = useCallback(
		async (content: string, asUsername: string) => {
			const { message, error } = await sendMessage(
				roomId,
				asUsername,
				content,
			);
			if (error || !message) return;

			const chatMsg: ChatMessage = { ...message, type: "chat" };

			setMessages((prev) => [...prev, chatMsg]);

			channelRef.current?.send({
				type: "broadcast",
				event: "chat-event",
				payload: {
					type: "message:add",
					message: chatMsg,
					username,
				} satisfies ChatEvent & { username: string },
			});
		},
		[roomId, username],
	);

	const addTranscript = useCallback(
		async (entry: ChatMessage) => {
			// Persist to DB
			const { message, error } = await saveTranscript(
				roomId,
				entry.username,
				entry.content,
			);
			if (error || !message) return;

			// Use DB-generated message (with proper id)
			setMessages((prev) => [...prev, message]);

			channelRef.current?.send({
				type: "broadcast",
				event: "chat-event",
				payload: {
					type: "message:add",
					message,
					username,
				} satisfies ChatEvent & { username: string },
			});
		},
		[roomId, username],
	);

	// Broadcast partial text (throttled) so all participants see live STT
	const lastPartialSendRef = useRef(0);
	const broadcastPartial = useCallback(
		(text: string) => {
			const now = Date.now();
			if (now - lastPartialSendRef.current < 300) return;
			lastPartialSendRef.current = now;

			channelRef.current?.send({
				type: "broadcast",
				event: "chat-event",
				payload: {
					type: "partial:update",
					text,
					speaker: username,
					username,
				} satisfies ChatEvent & { username: string },
			});
		},
		[username],
	);

	const broadcastMeetingEnded = useCallback(() => {
		channelRef.current?.send({
			type: "broadcast",
			event: "chat-event",
			payload: {
				type: "meeting:ended",
				username,
			} satisfies ChatEvent & { username: string },
		});
	}, [username]);

	return {
		messages,
		partialTexts,
		send,
		sendAs,
		addTranscript,
		broadcastPartial,
		broadcastMeetingEnded,
	};
}
