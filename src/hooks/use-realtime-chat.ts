"use client";

import { getMessages, sendMessage } from "@/app/actions";
import { getSupabaseClient } from "@/lib/supabase";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/components/video-call/types";

type ChatEvent =
	| { type: "message:add"; message: ChatMessage }
	| { type: "messages:sync"; messages: ChatMessage[] };

export function useRealtimeChat(roomId: string, username: string) {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const channelRef = useRef<ReturnType<
		ReturnType<typeof getSupabaseClient>["channel"]
	> | null>(null);
	const messagesRef = useRef(messages);
	messagesRef.current = messages;

	// Load existing messages on mount
	useEffect(() => {
		getMessages(roomId).then(({ messages: existing }) => {
			setMessages(existing);
		});
	}, [roomId]);

	// Set up realtime channel
	useEffect(() => {
		const supabase = getSupabaseClient();
		const channel = supabase.channel(`chat:${roomId}`);

		channel
			.on("presence", { event: "join" }, () => {
				// Sync messages to newly joined users
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
					if (payload.username === username) return; // Skip own events

					switch (payload.type) {
						case "message:add":
							setMessages((prev) => [...prev, payload.message]);
							break;
						case "messages:sync":
							setMessages((prev) => {
								// Merge: keep existing, add any new ones
								const existingIds = new Set(prev.map((m) => m.id));
								const newMessages = payload.messages.filter(
									(m) => !existingIds.has(m.id),
								);
								return [...prev, ...newMessages];
							});
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

			// Optimistic local update
			setMessages((prev) => [...prev, message]);

			// Broadcast to others
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

	return { messages, send };
}
