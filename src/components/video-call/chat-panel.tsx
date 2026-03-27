"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "./types";

interface ChatPanelProps {
	messages: ChatMessage[];
	onSend: (content: string) => void;
	username: string;
}

export function ChatPanel({ messages, onSend, username }: ChatPanelProps) {
	const [input, setInput] = useState("");
	const scrollRef = useRef<HTMLDivElement>(null);
	const chatMessages = messages.filter((msg) => msg.type === "chat");

	useEffect(() => {
		scrollRef.current?.scrollTo({
			top: scrollRef.current.scrollHeight,
			behavior: "smooth",
		});
	}, [chatMessages.length]);

	const handleSend = () => {
		if (!input.trim()) return;
		onSend(input);
		setInput("");
	};

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="border-b border-border px-4 py-3 flex items-center justify-between">
				<h3 className="text-sm font-semibold">Chat</h3>
			</div>

			{/* Chat feed */}
			<div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
				{chatMessages.length === 0 && (
					<p className="text-center text-sm text-muted-foreground py-8">
						No messages yet
					</p>
				)}
				{chatMessages.map((msg) => (
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

			{/* Chat input */}
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
