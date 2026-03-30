"use client";

import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	addFeedItem as addFeedItemAction,
	getFeedItems,
	getMessages,
	saveTranscript,
	sendMessage,
	updateFeedItem as updateFeedItemAction,
} from "@/app/actions";
import type {
	ChatMessage,
	FeedItem,
	FlyingReactionPayload,
} from "@/components/video-call/types";
import { getSupabaseClient } from "@/lib/supabase";

type ChatEvent =
	| { type: "message:add"; message: ChatMessage }
	| { type: "messages:sync"; messages: ChatMessage[] }
	| { type: "partial:update"; text: string; speaker: string }
	| { type: "meeting:ended" }
	| { type: "feeditem:add"; item: FeedItem }
	| { type: "feeditem:update"; id: string; updates: Partial<FeedItem> }
	| { type: "feeditems:sync"; items: FeedItem[] }
	| { type: "reaction:flying"; reaction: FlyingReactionPayload };

const MAX_FLYING_REACTIONS = 48;

function buildFlyingReaction(
	emoji: string,
	fromUsername: string,
): FlyingReactionPayload {
	const h = typeof window !== "undefined" ? window.innerHeight : 640;
	const originX = 0.28 + Math.random() * 0.44;
	const driftX = (Math.random() - 0.5) * 100;
	const arcX = driftX * 0.35 + (Math.random() - 0.5) * 48;
	const travelY = -(0.52 + Math.random() * 0.22) * h;
	const durationMs = 2300 + Math.floor(Math.random() * 1800);
	const rotateDeg = (Math.random() - 0.5) * 22;
	return {
		id: nanoid(12),
		emoji: emoji.slice(0, 8),
		fromUsername,
		originX,
		driftX,
		arcX,
		travelY,
		durationMs,
		rotateDeg,
	};
}

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
	const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
	const [partialTexts, setPartialTexts] = useState<Record<string, string>>({});
	const [flyingReactions, setFlyingReactions] = useState<
		FlyingReactionPayload[]
	>([]);
	const channelRef = useRef<ReturnType<
		ReturnType<typeof getSupabaseClient>["channel"]
	> | null>(null);
	const messagesRef = useRef(messages);
	messagesRef.current = messages;
	const feedItemsRef = useRef(feedItems);
	feedItemsRef.current = feedItems;

	// Load existing chat messages and feed items on mount
	useEffect(() => {
		getMessages(roomId).then(({ messages: existing }) => {
			setMessages(existing);
		});
		getFeedItems(roomId).then(({ items }) => {
			setFeedItems(items);
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
				if (feedItemsRef.current.length > 0) {
					channel.send({
						type: "broadcast",
						event: "chat-event",
						payload: {
							type: "feeditems:sync",
							items: feedItemsRef.current,
							username,
						} satisfies ChatEvent & { username: string },
					});
				}
			})
			.on(
				"broadcast",
				{ event: "chat-event" },
				({ payload }: { payload: ChatEvent & { username: string } }) => {
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
						case "feeditem:add":
							setFeedItems((prev) => {
								if (prev.some((f) => f.id === payload.item.id)) return prev;
								return [...prev, payload.item];
							});
							break;
						case "feeditem:update":
							setFeedItems((prev) =>
								prev.map((f) =>
									f.id === payload.id
										? ({ ...f, ...payload.updates } as FeedItem)
										: f,
								),
							);
							break;
						case "feeditems:sync":
							setFeedItems((prev) => {
								const existingIds = new Set(prev.map((f) => f.id));
								const newItems = payload.items.filter(
									(f: FeedItem) => !existingIds.has(f.id),
								);
								return [...prev, ...newItems];
							});
							break;
						case "meeting:ended":
							onMeetingEndedRef.current?.();
							break;
						case "reaction:flying":
							setFlyingReactions((prev) =>
								[...prev, payload.reaction].slice(-MAX_FLYING_REACTIONS),
							);
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
			const { message, error } = await sendMessage(roomId, asUsername, content);
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

	const removeFlyingReaction = useCallback((id: string) => {
		setFlyingReactions((prev) => prev.filter((r) => r.id !== id));
	}, []);

	const sendFlyingReaction = useCallback(
		(emoji: string) => {
			const reaction = buildFlyingReaction(emoji, username);
			setFlyingReactions((prev) =>
				[...prev, reaction].slice(-MAX_FLYING_REACTIONS),
			);
			channelRef.current?.send({
				type: "broadcast",
				event: "chat-event",
				payload: {
					type: "reaction:flying",
					reaction,
					username,
				} satisfies ChatEvent & { username: string },
			});
		},
		[username],
	);

	const addFeedItem = useCallback(
		async (item: {
			type: string;
			title?: string;
			content: string;
			metadata?: string;
		}): Promise<string | null> => {
			const { item: saved, error } = await addFeedItemAction(
				roomId,
				username,
				item,
			);
			if (error || !saved) return null;

			setFeedItems((prev) => [...prev, saved as FeedItem]);

			channelRef.current?.send({
				type: "broadcast",
				event: "chat-event",
				payload: {
					type: "feeditem:add",
					item: saved,
					username,
				} satisfies ChatEvent & { username: string },
			});

			return saved.id;
		},
		[roomId, username],
	);

	const updateFeedItem = useCallback(
		async (
			itemId: string,
			updates: { content?: string; title?: string; isDone?: boolean },
		) => {
			await updateFeedItemAction(roomId, itemId, updates);

			setFeedItems((prev) =>
				prev.map((f) =>
					f.id === itemId
						? ({ ...f, ...updates, updatedAt: Date.now() } as FeedItem)
						: f,
				),
			);

			channelRef.current?.send({
				type: "broadcast",
				event: "chat-event",
				payload: {
					type: "feeditem:update",
					id: itemId,
					updates,
					username,
				} satisfies ChatEvent & { username: string },
			});
		},
		[roomId, username],
	);

	return {
		messages,
		feedItems,
		partialTexts,
		flyingReactions,
		removeFlyingReaction,
		sendFlyingReaction,
		send,
		sendAs,
		addTranscript,
		addFeedItem,
		updateFeedItem,
		broadcastPartial,
		broadcastMeetingEnded,
	};
}
