"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, MicOff, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "./types";

interface ChatPanelProps {
	messages: ChatMessage[];
	onSend: (content: string) => void;
	username: string;
	partialTexts: Record<string, string>;
	transcription: {
		isActive: boolean;
		isListening: boolean;
		start: () => void;
		stop: () => void;
	};
}

export function ChatPanel({
	messages,
	onSend,
	username,
	partialTexts,
	transcription,
}: ChatPanelProps) {
	const [input, setInput] = useState("");
	const scrollRef = useRef<HTMLDivElement>(null);

	const activePartials = Object.entries(partialTexts).filter(
		([, text]) => text,
	);

	useEffect(() => {
		scrollRef.current?.scrollTo({
			top: scrollRef.current.scrollHeight,
			behavior: "smooth",
		});
	}, [messages, activePartials.length]);

	const handleSend = () => {
		if (!input.trim()) return;
		onSend(input);
		setInput("");
	};

	return (
		<div className="flex h-full flex-col">
			{/* Header with transcription toggle */}
			<div className="border-b border-border px-4 py-3 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<h3 className="text-sm font-semibold">Chat</h3>
					{transcription.isActive && (
						<span
							className={`h-2 w-2 rounded-full ${transcription.isListening ? "bg-green-500" : "bg-yellow-500"}`}
							title={
								transcription.isListening ? "Transcribing" : "Paused (muted)"
							}
						/>
					)}
				</div>
				<Button
					variant={transcription.isActive ? "destructive" : "secondary"}
					size="sm"
					className="h-7 gap-1.5"
					onClick={
						transcription.isActive ? transcription.stop : transcription.start
					}
					title={
						transcription.isActive
							? "Stop transcription"
							: "Start transcription"
					}
				>
					{transcription.isActive ? (
						<>
							<MicOff className="h-3.5 w-3.5" />
							STT
						</>
					) : (
						<>
							<Mic className="h-3.5 w-3.5" />
							STT
						</>
					)}
				</Button>
			</div>

			{/* Unified feed */}
			<div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
				{messages.length === 0 && activePartials.length === 0 && (
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
							{msg.type === "transcript" && (
								<span className="ml-1 opacity-60">- transcript</span>
							)}
						</span>
						<div
							className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${
								msg.type === "transcript"
									? "bg-muted/50 text-foreground italic border border-border"
									: msg.username === username
										? "bg-primary text-primary-foreground"
										: "bg-muted text-foreground"
							}`}
						>
							{msg.content}
						</div>
					</div>
				))}

				{/* Live partial transcripts from all participants */}
				{activePartials.map(([speaker, text]) => (
					<div
						key={`partial-${speaker}`}
						className={`flex flex-col ${speaker === username ? "items-end" : "items-start"}`}
					>
						<span className="text-xs text-muted-foreground mb-1">
							{speaker}
							<span className="ml-1 opacity-60">- listening...</span>
						</span>
						<div className="rounded-lg px-3 py-2 text-sm max-w-[85%] bg-muted/30 text-muted-foreground italic border border-dashed border-border">
							{text}
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
