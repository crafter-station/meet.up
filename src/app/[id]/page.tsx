"use client";

import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MediaPreview, type MediaSettings } from "@/components/media-preview";
import { VideoCall } from "@/components/video-call/video-call";
import { useAdmission } from "@/hooks/use-admission";
import { Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function getDisplayName(user: ReturnType<typeof useUser>["user"]): string {
	if (!user) return "";
	if (user.firstName) {
		return user.lastName
			? `${user.firstName} ${user.lastName}`
			: user.firstName;
	}
	return user.emailAddresses[0]?.emailAddress ?? "";
}

export default function RoomPage() {
	const { id } = useParams<{ id: string }>();
	const { isSignedIn, isLoaded, user } = useUser();
	const [username, setUsername] = useState("");
	const [callData, setCallData] = useState<{
		token: string;
		roomUrl: string;
	} | null>(null);
	const [joining, setJoining] = useState(false);
	const [ended, setEnded] = useState(false);
	const [error, setError] = useState("");
	const [waitingForAdmission, setWaitingForAdmission] = useState(false);
	const [rejected, setRejected] = useState(false);
	const [mediaSettings, setMediaSettings] = useState<MediaSettings>({
		camOn: true,
		micOn: true,
		selectedCamId: "",
		selectedMicId: "",
	});

	const ownerSecret =
		typeof window !== "undefined"
			? sessionStorage.getItem(`ownerSecret:${id}`)
			: null;
	const isOwner = !!ownerSecret;

	// Auto-fill username from Clerk user once loaded
	useEffect(() => {
		if (isLoaded && isSignedIn && user) {
			const name = getDisplayName(user);
			if (name) setUsername(name);
		}
	}, [isLoaded, isSignedIn, user]);

	const effectiveUsername = username.trim();

	const joinRoom = useCallback(async () => {
		if (!effectiveUsername) return;

		setJoining(true);
		setError("");

		try {
			const headers: Record<string, string> = {
				"Content-Type": "application/json",
			};
			if (ownerSecret) headers["X-Owner-Secret"] = ownerSecret;

			const res = await fetch(`/api/r/${id}/join`, {
				method: "POST",
				headers,
				body: JSON.stringify({ username: effectiveUsername }),
			});

			if (res.status === 410) {
				setEnded(true);
				return;
			}

			if (res.status === 202) {
				setWaitingForAdmission(true);
				setJoining(false);
				return;
			}

			if (!res.ok) throw new Error("Failed to join room");

			const data = await res.json();
			setCallData({ token: data.token, roomUrl: data.roomUrl });
		} catch {
			setError("Could not join the room. Check the code and try again.");
		} finally {
			setJoining(false);
		}
	}, [effectiveUsername, id, ownerSecret]);

	const { requestAdmission, cancelRequest } = useAdmission({
		roomId: id,
		username: effectiveUsername,
		isOwner: false,
		onAccepted: () => {
			setWaitingForAdmission(false);
			joinRoom();
		},
		onRejected: () => {
			setRejected(true);
			setWaitingForAdmission(false);
		},
	});

	// When entering waiting state, send the admission request
	useEffect(() => {
		if (waitingForAdmission) {
			requestAdmission();
		}
	}, [waitingForAdmission, requestAdmission]);

	const handleJoin = (e: React.FormEvent) => {
		e.preventDefault();
		joinRoom();
	};

	if (rejected) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
				<div className="text-center space-y-2">
					<h1 className="text-2xl font-bold tracking-tight">Request denied</h1>
					<p className="text-sm text-muted-foreground">
						The host did not admit you to this meeting.
					</p>
				</div>
				<Link href="/">
					<Button>Back to home</Button>
				</Link>
			</div>
		);
	}

	if (ended) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
				<div className="text-center space-y-2">
					<h1 className="text-2xl font-bold tracking-tight">Meeting ended</h1>
					<p className="text-sm text-muted-foreground">
						This meeting has already ended
					</p>
				</div>
				<div className="flex gap-2">
					<Link href={`/summary/${id}`}>
						<Button variant="secondary">View summary</Button>
					</Link>
					<Link href="/">
						<Button>Start a new meeting</Button>
					</Link>
				</div>
			</div>
		);
	}

	if (waitingForAdmission) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
				<div className="text-center space-y-2">
					<Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
					<h1 className="text-2xl font-bold tracking-tight">
						Waiting to be admitted
					</h1>
					<p className="text-sm text-muted-foreground">
						The host will let you in soon...
					</p>
				</div>
				<Button
					variant="secondary"
					onClick={() => {
						cancelRequest();
						setWaitingForAdmission(false);
					}}
				>
					Cancel
				</Button>
			</div>
		);
	}

	if (callData) {
		return (
			<div className="flex h-dvh">
				<VideoCall
					roomUrl={callData.roomUrl}
					token={callData.token}
					username={effectiveUsername}
					roomId={id}
					mediaSettings={mediaSettings}
					isOwner={isOwner}
					ownerSecret={ownerSecret}
				/>
			</div>
		);
	}

	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8">
			<div className="text-center space-y-1">
				<h1 className="text-2xl font-bold tracking-tight">Join meeting</h1>
				<p className="text-sm text-muted-foreground font-mono">{id}</p>
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
					disabled={!effectiveUsername || joining}
				>
					{joining ? "Joining..." : "Join now"}
				</Button>
				{error && (
					<p className="text-sm text-destructive text-center">{error}</p>
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
