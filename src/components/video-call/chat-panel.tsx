"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSlashCommands } from "@/hooks/use-slash-commands";
import { commands } from "@/lib/commands";
import { Loader2, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SlashCommandMenu } from "./slash-command-menu";
import type { ChatMessage } from "./types";

interface ChatPanelProps {
	messages: ChatMessage[];
	onSend: (content: string) => void;
	onSendAs: (content: string, asUsername: string) => void;
	username: string;
	roomId: string;
}

export function ChatPanel({
	messages,
	onSend,
	onSendAs,
	username,
	roomId,
}: ChatPanelProps) {
	const [input, setInput] = useState("");
	const scrollRef = useRef<HTMLDivElement>(null);
	const chatMessages = messages.filter((msg) => msg.type === "chat");

	const {
		isOpen,
		filteredCommands,
		selectedIndex,
		isExecuting,
		handleInputChange,
		handleKeyDown,
		selectCommand,
	} = useSlashCommands({
		roomId,
		username,
		messages,
		sendMessage: onSend,
		sendMessageAs: onSendAs,
	});

	useEffect(() => {
		scrollRef.current?.scrollTo({
			top: scrollRef.current.scrollHeight,
			behavior: "smooth",
		});
	}, [chatMessages.length]);

	const handleSend = () => {
		const trimmed = input.trim();
		if (!trimmed) return;

		if (trimmed.startsWith("/")) {
			const cmdName = trimmed.slice(1).split(" ")[0];
			const cmd = commands.find((c) => c.name === cmdName);
			if (cmd) {
				const args = trimmed.slice(1 + cmdName.length).trim();
				selectCommand(cmd, args);
				setInput("");
				return;
			}
		}

		onSend(trimmed);
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
				className="relative border-t border-border p-3 flex gap-2"
			>
				{isOpen && filteredCommands.length > 0 && (
					<SlashCommandMenu
						commands={filteredCommands}
						selectedIndex={selectedIndex}
						onSelect={(cmd) => {
							selectCommand(cmd);
							setInput("");
						}}
					/>
				)}
				<Input
					value={input}
					onChange={(e) => {
						const value = e.target.value;
						setInput(value);
						handleInputChange(value);
					}}
					onKeyDown={(e) => {
						if (handleKeyDown(e)) {
							e.preventDefault();
							if (e.key === "Enter") setInput("");
						}
					}}
					placeholder="Type a message or / for commands..."
					className="flex-1"
				/>
				<Button
					type="submit"
					size="icon"
					disabled={!input.trim() || isExecuting}
				>
					{isExecuting ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Send className="h-4 w-4" />
					)}
				</Button>
			</form>
		</div>
	);
}
