"use client";

import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MediaPreview } from "@/components/media-preview";
import { Mail } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useRoomContext } from "../context";

function getDisplayName(user: ReturnType<typeof useUser>["user"]): string {
	if (!user) return "";
	if (user.firstName) {
		return user.lastName
			? `${user.firstName} ${user.lastName}`
			: user.firstName;
	}
	return user.emailAddresses[0]?.emailAddress ?? "";
}

export function PreviewView() {
	const { state, username, setUsername, setMediaSettings, joinRoom, roomId } =
		useRoomContext();
	const { isSignedIn, isLoaded, user } = useUser();
	const effectiveUsername = username.trim();
	const isJoining = state.status === "joining";

	useEffect(() => {
		if (isLoaded && isSignedIn && user) {
			const name = getDisplayName(user);
			if (name) setUsername(name);
		}
	}, [isLoaded, isSignedIn, user, setUsername]);

	const handleJoin = (e: React.FormEvent) => {
		e.preventDefault();
		joinRoom();
	};

	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8">
			<div className="text-center space-y-1">
				<h1 className="text-2xl font-bold tracking-tight">Join meeting</h1>
				<p className="text-sm text-muted-foreground font-mono">{roomId}</p>
			</div>

			<MediaPreview onSettingsChange={setMediaSettings} />

			<form onSubmit={handleJoin} className="w-full max-w-md space-y-3">
				{isSignedIn ? (
					<p className="text-center text-sm text-foreground">
						Joining as <span className="font-medium">{effectiveUsername}</span>
					</p>
				) : (
					<Input
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						placeholder="Your name"
						className="h-12 text-center"
						autoFocus
					/>
				)}
				<Button
					type="submit"
					className="w-full h-12"
					disabled={!effectiveUsername || isJoining}
				>
					{isJoining ? "Joining..." : "Join now"}
				</Button>
				{state.status === "error" && (
					<p className="text-sm text-destructive text-center">
						{state.message}
					</p>
				)}
				{!isSignedIn && (
					<p className="text-xs text-muted-foreground text-center">
						<Link href="/sign-in" className="underline underline-offset-2">
							<Mail className="h-3 w-3 inline mr-1" />
							Sign in
						</Link>{" "}
						to receive meeting notes by email
					</p>
				)}
			</form>
		</div>
	);
}
