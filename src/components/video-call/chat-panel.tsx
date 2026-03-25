"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRealtimeChat } from "@/hooks/use-realtime-chat";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ChatPanelProps {
	roomId: string;
	username: string;
}

export function ChatPanel({ roomId, username }: ChatPanelProps) {
	const { messages, send } = useRealtimeChat(roomId, username);
	const [input, setInput] = useState("");
	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		scrollRef.current?.scrollTo({
			top: scrollRef.current.scrollHeight,
			behavior: "smooth",
		});
	}, [messages]);

	const handleSend = () => {
		if (!input.trim()) return;
		send(input);
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
					handleSend();
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
