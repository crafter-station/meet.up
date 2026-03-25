"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
	const router = useRouter();
	const [roomCode, setRoomCode] = useState("");
	const [creating, setCreating] = useState(false);

	const createRoom = async () => {
		setCreating(true);
		try {
			const res = await fetch("/api/r", { method: "POST" });
			const { id } = await res.json();
			router.push(`/${id}`);
		} finally {
			setCreating(false);
		}
	};

	const joinRoom = (e: React.FormEvent) => {
		e.preventDefault();
		if (roomCode.trim()) {
			router.push(`/${roomCode.trim()}`);
		}
	};

	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-8 px-4">
			<div className="text-center space-y-2">
				<div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary mb-4">
					<Video className="h-8 w-8 text-primary-foreground" />
				</div>
				<h1 className="text-3xl font-bold tracking-tight">meet.up</h1>
				<p className="text-muted-foreground">Video calls with superpowers</p>
			</div>

			<div className="w-full max-w-sm space-y-4">
				<Button
					onClick={createRoom}
					disabled={creating}
					className="w-full h-12 text-base"
					size="lg"
				>
					{creating ? "Creating..." : "Start a new meeting"}
				</Button>

				<div className="relative">
					<div className="absolute inset-0 flex items-center">
						<span className="w-full border-t border-border" />
					</div>
					<div className="relative flex justify-center text-xs uppercase">
						<span className="bg-background px-2 text-muted-foreground">
							or join one
						</span>
					</div>
				</div>

				<form onSubmit={joinRoom} className="flex gap-2">
					<Input
						value={roomCode}
						onChange={(e) => setRoomCode(e.target.value)}
						placeholder="Enter room code"
						className="flex-1 h-12"
					/>
					<Button
						type="submit"
						variant="secondary"
						size="icon"
						className="h-12 w-12"
						disabled={!roomCode.trim()}
					>
						<ArrowRight className="h-5 w-5" />
					</Button>
				</form>
			</div>
		</div>
	);
}
