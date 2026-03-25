"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseClient } from "@/lib/supabase";
import { nanoid } from "nanoid";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "./types";

interface ChatPanelProps {
	roomId: string;
	username: string;
}

export function ChatPanel({ roomId, username }: ChatPanelProps) {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState("");
	const scrollRef = useRef<HTMLDivElement>(null);
	const channelRef = useRef<ReturnType<
		ReturnType<typeof getSupabaseClient>["channel"]
	> | null>(null);

	useEffect(() => {
		const supabase = getSupabaseClient();
		const channel = supabase.channel(`chat:${roomId}`);

		channel
			.on("broadcast", { event: "message" }, ({ payload }) => {
				setMessages((prev) => [...prev, payload as ChatMessage]);
			})
			.subscribe();

		channelRef.current = channel;

		return () => {
			supabase.removeChannel(channel);
		};
	}, [roomId]);

	useEffect(() => {
		scrollRef.current?.scrollTo({
			top: scrollRef.current.scrollHeight,
			behavior: "smooth",
		});
	}, [messages]);

	const sendMessage = () => {
		if (!input.trim() || !channelRef.current) return;

		const msg: ChatMessage = {
			id: nanoid(),
			username,
			content: input.trim(),
			timestamp: Date.now(),
		};

		channelRef.current.send({
			type: "broadcast",
			event: "message",
			payload: msg,
		});

		// Add locally (broadcast doesn't echo back to sender)
		setMessages((prev) => [...prev, msg]);
		setInput("");
	};

	return (
		<div className="flex h-full flex-col">
			<div className="border-b border-border px-4 py-3">
				<h3 className="text-sm font-semibold">Chat</h3>
			</div>

			<div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
				{messages.length === 0 && (
					<p className="text-center text-sm text-muted-foreground py-8">
						No messages yet
					</p>
				)}
				{messages.map((msg) => (
					<div
						key={msg.id}
						className={`flex flex-col ${msg.username === username ? "items-end" : "items-start"}`}
					>
						<span className="text-xs text-muted-foreground mb-1">
							{msg.username}
						</span>
						<div
							className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${
								msg.username === username
									? "bg-primary text-primary-foreground"
									: "bg-muted text-foreground"
							}`}
						>
							{msg.content}
						</div>
					</div>
				))}
			</div>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					sendMessage();
				}}
				className="border-t border-border p-3 flex gap-2"
			>
				<Input
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder="Type a message..."
					className="flex-1"
				/>
				<Button type="submit" size="icon" disabled={!input.trim()}>
					<Send className="h-4 w-4" />
				</Button>
			</form>
		</div>
	);
}
