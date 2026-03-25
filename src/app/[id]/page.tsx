"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VideoCall } from "@/components/video-call/video-call";
import { Video } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function RoomPage() {
	const { id } = useParams<{ id: string }>();
	const [username, setUsername] = useState("");
	const [callData, setCallData] = useState<{
		token: string;
		roomUrl: string;
	} | null>(null);
	const [joining, setJoining] = useState(false);
	const [error, setError] = useState("");

	const handleJoin = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!username.trim()) return;

		setJoining(true);
		setError("");

		try {
			const res = await fetch(`/api/r/${id}/join`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username: username.trim() }),
			});

			if (!res.ok) throw new Error("Failed to join room");

			const data = await res.json();
			setCallData({ token: data.token, roomUrl: data.roomUrl });
		} catch {
			setError("Could not join the room. Check the code and try again.");
		} finally {
			setJoining(false);
		}
	};

	if (callData) {
		return (
			<div className="flex flex-1">
				<VideoCall
					roomUrl={callData.roomUrl}
					token={callData.token}
					username={username.trim()}
					roomId={id}
				/>
			</div>
		);
	}

	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
			<div className="text-center space-y-2">
				<div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary mb-2">
					<Video className="h-7 w-7 text-primary-foreground" />
				</div>
				<h1 className="text-2xl font-bold tracking-tight">Join meeting</h1>
				<p className="text-sm text-muted-foreground font-mono">{id}</p>
			</div>

			<form onSubmit={handleJoin} className="w-full max-w-xs space-y-3">
				<Input
					value={username}
					onChange={(e) => setUsername(e.target.value)}
					placeholder="Your name"
					className="h-12 text-center"
					autoFocus
				/>
				<Button
					type="submit"
					className="w-full h-12"
					disabled={!username.trim() || joining}
				>
					{joining ? "Joining..." : "Join now"}
				</Button>
				{error && (
					<p className="text-sm text-destructive text-center">{error}</p>
				)}
			</form>
		</div>
	);
}
