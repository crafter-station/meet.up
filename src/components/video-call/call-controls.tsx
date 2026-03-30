"use client";

import { useUser } from "@clerk/nextjs";
import {
	useDaily,
	useDevices,
	useLocalSessionId,
	useParticipantProperty,
} from "@daily-co/daily-react";
import {
	Bell,
	Bot,
	Loader2,
	MessageSquare,
	PhoneOff,
	Settings,
	Smile,
	Square,
	UserCheck,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { endMeetingQuick } from "@/app/actions";
import { CamToggle, MicToggle } from "@/components/media-toggles";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { PendingRequest } from "@/hooks/use-admission";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
	browserNotificationsSupported,
	getJoinRequestNotificationPermission,
	notify,
	requestJoinRequestNotificationPermission,
} from "@/lib/notify";

interface CallControlsProps {
	showPanel: boolean;
	onTogglePanel: () => void;
	showMobileTranscription: boolean;
	onToggleMobileTranscription: () => void;
	mobileTranscriptionStatus: "off" | "waiting" | "talking";
	roomId: string;
	onMeetingEnded: () => void;
	isOwner: boolean;
	ownerSecret: string | null;
	pendingRequests: PendingRequest[];
	onAcceptUser: (username: string, ownerSecret: string) => void;
	onRejectUser: (username: string, ownerSecret: string) => void;
	onLeaveCall: () => void;
	onBroadcastOwnershipTransfer: (
		newOwner: string,
		newOwnerSecret: string,
	) => void;
	voiceActionsEnabled: boolean;
	onVoiceActionsChange: (enabled: boolean) => void;
	onSendReaction: (emoji: string) => void;
}

const REACTION_EMOJIS = ["❤️", "👍", "😂", "🔥", "👏", "🎉"] as const;

export function CallControls({
	showPanel,
	onTogglePanel,
	showMobileTranscription,
	onToggleMobileTranscription,
	mobileTranscriptionStatus,
	roomId,
	onMeetingEnded,
	isOwner,
	ownerSecret,
	pendingRequests,
	onAcceptUser,
	onRejectUser,
	onLeaveCall,
	onBroadcastOwnershipTransfer,
	voiceActionsEnabled,
	onVoiceActionsChange,
	onSendReaction,
}: CallControlsProps) {
	const daily = useDaily();
	const localSessionId = useLocalSessionId();
	const audioState = useParticipantProperty(
		localSessionId,
		"tracks.audio.state",
	);
	const audioOff = useParticipantProperty(localSessionId, "tracks.audio.off");
	const videoState = useParticipantProperty(
		localSessionId,
		"tracks.video.state",
	);
	const videoOff = useParticipantProperty(localSessionId, "tracks.video.off");
	const isMicOn =
		typeof audioOff === "boolean"
			? !audioOff
			: audioState === "playable" || audioState === "sendable";
	const isCamOn =
		typeof videoOff === "boolean"
			? !videoOff
			: videoState === "playable" || videoState === "sendable";
	const [ending, setEnding] = useState(false);
	const [leaving, setLeaving] = useState(false);
	const { isSignedIn } = useUser();
	const { fingerprintId } = useCurrentUser();

	const {
		cameras,
		microphones,
		currentCam,
		currentMic,
		setCamera,
		setMicrophone,
	} = useDevices();

	const toggleMic = () => daily?.setLocalAudio(!isMicOn);
	const toggleCam = () => daily?.setLocalVideo(!isCamOn);

	const micDevices = microphones.map((m) => ({
		deviceId: m.device.deviceId,
		label: m.device.label || `Microphone ${m.device.deviceId.slice(0, 4)}`,
	}));
	const camDevices = cameras.map((c) => ({
		deviceId: c.device.deviceId,
		label: c.device.label || `Camera ${c.device.deviceId.slice(0, 4)}`,
	}));

	const leave = async () => {
		setLeaving(true);
		try {
			const headers: Record<string, string> = {
				"Content-Type": "application/json",
			};
			if (ownerSecret) headers["X-Owner-Secret"] = ownerSecret;

			const res = await fetch(`/api/r/${roomId}/leave`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					username: daily?.participants()?.local?.user_name,
					fingerprintId,
				}),
			});
			const data = await res.json();

			// Anonymous owner leaving — broadcast ownership transfer before navigating
			if (data.transferred) {
				onBroadcastOwnershipTransfer(
					data.transferred.newOwner,
					data.transferred.ownerSecret,
				);
			}

			// Logged-in owner → back to preview (can re-enter)
			if (isOwner && isSignedIn) {
				onLeaveCall();
				return;
			}

			// Everyone else → go home
			daily?.leave();
			daily?.destroy();
			window.location.href = "/";
		} catch {
			daily?.leave();
			daily?.destroy();
			window.location.href = "/";
		}
	};

	const handleEndMeeting = async () => {
		setEnding(true);
		try {
			await endMeetingQuick(roomId);
			onMeetingEnded();
			daily?.leave();
			daily?.destroy();
			window.location.href = `/summary/${roomId}`;
		} catch {
			notify("error", { title: "Failed to end meeting" });
			daily?.leave();
			daily?.destroy();
			window.location.href = "/";
		}
	};

	const leaveButton = (
		<Button
			variant="secondary"
			size="icon"
			className="rounded-full h-12 w-12"
			onClick={leave}
			disabled={leaving}
			title="Leave call"
		>
			{leaving ? (
				<Loader2 className="h-5 w-5 animate-spin" />
			) : (
				<PhoneOff className="h-5 w-5" />
			)}
		</Button>
	);

	const endButton = isOwner ? (
		<Button
			variant="destructive"
			size="icon"
			className="rounded-full h-12 w-12"
			onClick={handleEndMeeting}
			disabled={ending}
			title="End meeting for everyone"
		>
			{ending ? (
				<Loader2 className="h-5 w-5 animate-spin" />
			) : (
				<Square className="h-4 w-4 fill-current" />
			)}
		</Button>
	) : null;

	const mobileTranscriptionDotClass =
		mobileTranscriptionStatus === "talking"
			? "bg-green-500"
			: mobileTranscriptionStatus === "waiting"
				? "bg-yellow-500"
				: "bg-slate-500";
	const mobileTranscriptionStatusLabel =
		mobileTranscriptionStatus === "talking"
			? "Talking"
			: mobileTranscriptionStatus === "waiting"
				? "Waiting"
				: "Off";

	return (
		<div className="flex items-center justify-center gap-2 border-t border-border px-4 py-3">
			<MicToggle
				isOn={isMicOn}
				onToggle={toggleMic}
				devices={micDevices}
				selectedDeviceId={currentMic?.device.deviceId ?? ""}
				onSelectDevice={setMicrophone}
			/>

			<CamToggle
				isOn={isCamOn}
				onToggle={toggleCam}
				devices={camDevices}
				selectedDeviceId={currentCam?.device.deviceId ?? ""}
				onSelectDevice={setCamera}
			/>

			<ReactionsMenu onPick={onSendReaction} />

			{/* Call controls — desktop: inline, mobile: grouped for owner */}
			{isOwner ? (
				<>
					<div className="hidden md:flex gap-2">
						{leaveButton}
						{endButton}
					</div>
					<FloatingMenu
						className="md:hidden"
						trigger={
							<Button
								variant="secondary"
								size="icon"
								className="rounded-full h-12 w-12"
								title="Call options"
							>
								<PhoneOff className="h-5 w-5" />
							</Button>
						}
					>
						<Button
							variant="secondary"
							className="gap-2"
							onClick={leave}
							disabled={leaving}
						>
							{leaving ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<PhoneOff className="h-4 w-4" />
							)}
							Leave
						</Button>
						<Button
							variant="destructive"
							className="gap-2"
							onClick={handleEndMeeting}
							disabled={ending}
						>
							{ending ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Square className="h-3.5 w-3.5 fill-current" />
							)}
							End
						</Button>
					</FloatingMenu>
				</>
			) : (
				leaveButton
			)}

			<div className="hidden md:block mx-2 h-8 w-px bg-border" />

			<Button
				variant={showPanel ? "default" : "secondary"}
				size="icon"
				className="rounded-full h-12 w-12"
				onClick={onTogglePanel}
				title="Toggle chat"
			>
				<MessageSquare className="h-5 w-5" />
			</Button>
			<Button
				variant={showMobileTranscription ? "default" : "secondary"}
				size="icon"
				className="relative rounded-full h-12 w-12"
				onClick={onToggleMobileTranscription}
				title={`Transcription: ${mobileTranscriptionStatusLabel}`}
			>
				<Bot className="h-5 w-5" />
				{mobileTranscriptionStatus !== "off" && (
					<span
						className={`absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${mobileTranscriptionDotClass}`}
					/>
				)}
			</Button>

			{/* Owner admin controls — desktop: inline, mobile: grouped */}
			{isOwner && (
				<>
					<div className="hidden md:flex gap-2">
						<RequestsDialog
							pendingRequests={pendingRequests}
							ownerSecret={ownerSecret!}
							onAccept={onAcceptUser}
							onReject={onRejectUser}
						/>
						<SettingsDialog
							roomId={roomId}
							ownerSecret={ownerSecret!}
							voiceActionsEnabled={voiceActionsEnabled}
							onVoiceActionsChange={onVoiceActionsChange}
						/>
					</div>
					<FloatingMenu
						className="md:hidden"
						trigger={
							<Button
								variant="secondary"
								size="icon"
								className="rounded-full h-12 w-12 relative"
								title="Room admin"
							>
								<Settings className="h-5 w-5" />
								{pendingRequests.length > 0 && (
									<span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
										{pendingRequests.length}
									</span>
								)}
							</Button>
						}
					>
						<RequestsDialog
							pendingRequests={pendingRequests}
							ownerSecret={ownerSecret!}
							onAccept={onAcceptUser}
							onReject={onRejectUser}
						/>
						<SettingsDialog
							roomId={roomId}
							ownerSecret={ownerSecret!}
							voiceActionsEnabled={voiceActionsEnabled}
							onVoiceActionsChange={onVoiceActionsChange}
						/>
					</FloatingMenu>
				</>
			)}
		</div>
	);
}

// ── Reactions (emoji picker) ────────────────────────────────────

function ReactionsMenu({ onPick }: { onPick: (emoji: string) => void }) {
	const [open, setOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const onPointerDown = (e: PointerEvent) => {
			const target = e.target as Element;
			if (menuRef.current?.contains(target)) return;
			if (target.closest?.("[role='dialog']")) return;
			setOpen(false);
		};
		document.addEventListener("pointerdown", onPointerDown);
		return () => document.removeEventListener("pointerdown", onPointerDown);
	}, [open]);

	return (
		<div className="relative shrink-0" ref={menuRef}>
			<Button
				type="button"
				variant="secondary"
				size="icon"
				className="h-12 w-12 rounded-full"
				title="Reactions"
				aria-expanded={open}
				aria-haspopup="dialog"
				aria-label="Open reactions"
				onClick={() => setOpen((v) => !v)}
			>
				<Smile className="h-5 w-5" />
			</Button>
			{open && (
				<div
					role="dialog"
					aria-label="Choose a reaction"
					className="absolute bottom-full left-1/2 z-50 mb-2 flex w-max max-w-[min(100vw-2rem,18rem)] -translate-x-1/2 flex-wrap justify-center gap-1 rounded-xl border border-border bg-background p-2 shadow-lg"
				>
					{REACTION_EMOJIS.map((emo) => (
						<button
							key={emo}
							type="button"
							className="flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-colors hover:bg-muted active:scale-95"
							onClick={() => onPick(emo)}
							aria-label={`Send ${emo} reaction`}
						>
							{emo}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

// ── Floating menu (mobile grouping) ─────────────────────────────

function FloatingMenu({
	trigger,
	children,
	className,
}: {
	trigger: React.ReactNode;
	children: React.ReactNode;
	className?: string;
}) {
	const [open, setOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const onPointerDown = (e: PointerEvent) => {
			const target = e.target as Element;
			if (menuRef.current?.contains(target)) return;
			// Don't close if the click landed inside a dialog (portaled outside the menu)
			if (target.closest?.("[role='dialog']")) return;
			setOpen(false);
		};
		document.addEventListener("pointerdown", onPointerDown);
		return () => document.removeEventListener("pointerdown", onPointerDown);
	}, [open]);

	return (
		<div className={`relative ${className ?? ""}`} ref={menuRef}>
			<div onClick={() => setOpen((v) => !v)}>{trigger}</div>
			{open && (
				<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex gap-2 rounded-xl bg-background border border-border p-2 shadow-lg">
					{children}
				</div>
			)}
		</div>
	);
}

// ── Dialogs ─────────────────────────────────────────────────────

/** Browser permission is per-site, not per room — ask here, in admission context. */
function JoinRequestNotificationOptIn() {
	const [perm, setPerm] = useState(() =>
		getJoinRequestNotificationPermission(),
	);
	const [busy, setBusy] = useState(false);

	const sync = useCallback(() => {
		setPerm(getJoinRequestNotificationPermission());
	}, []);

	useEffect(() => {
		sync();
		document.addEventListener("visibilitychange", sync);
		return () => document.removeEventListener("visibilitychange", sync);
	}, [sync]);

	if (!browserNotificationsSupported() || perm === "unsupported") {
		return null;
	}

	if (perm === "granted") {
		return null;
	}

	const onEnable = async () => {
		setBusy(true);
		try {
			const next = await requestJoinRequestNotificationPermission();
			setPerm(next);
			if (next === "granted") {
				notify("success", {
					title: "Browser notifications on",
					description:
						"You will get a system alert when someone asks to join while this tab is in the background.",
					sound: false,
				});
			} else if (next === "denied") {
				notify("warning", {
					title: "Notifications blocked",
					description:
						"You can allow them later in your browser settings for this site.",
					sound: false,
				});
			}
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 space-y-2">
			<div className="flex items-start gap-2">
				<Bell className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
				<div className="space-y-1 min-w-0">
					<p className="text-sm font-medium leading-snug">
						Alerts when you are in another tab
					</p>
					{perm === "denied" ? (
						<p className="text-xs text-muted-foreground leading-snug">
							Notifications are blocked for this site. You can enable them in
							your browser settings.
						</p>
					) : (
						<p className="text-xs text-muted-foreground leading-snug">
							Get a desktop notification when someone knocks and this meeting
							tab is not in the foreground.
						</p>
					)}
				</div>
			</div>
			{perm === "default" ? (
				<Button
					type="button"
					size="sm"
					variant="secondary"
					className="w-full"
					disabled={busy}
					onClick={() => void onEnable()}
				>
					Enable notifications
				</Button>
			) : null}
		</div>
	);
}

function RequestsDialog({
	pendingRequests,
	ownerSecret,
	onAccept,
	onReject,
}: {
	pendingRequests: PendingRequest[];
	ownerSecret: string;
	onAccept: (username: string, ownerSecret: string) => void;
	onReject: (username: string, ownerSecret: string) => void;
}) {
	return (
		<Dialog>
			<DialogTrigger
				render={
					<Button
						variant="secondary"
						size="icon"
						className="rounded-full h-12 w-12 relative"
						title="Join requests"
					/>
				}
			>
				<UserCheck className="h-5 w-5" />
				{pendingRequests.length > 0 && (
					<span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
						{pendingRequests.length}
					</span>
				)}
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Join Requests</DialogTitle>
					<DialogDescription>
						{pendingRequests.length === 0
							? "No one is waiting to join."
							: "People waiting to join this meeting:"}
					</DialogDescription>
				</DialogHeader>
				<JoinRequestNotificationOptIn />
				<div className="space-y-2 max-h-60 overflow-y-auto">
					{pendingRequests.map((req) => (
						<div
							key={req.username}
							className="flex items-center justify-between p-2 rounded-lg bg-muted"
						>
							<span className="text-sm font-medium">{req.username}</span>
							<div className="flex gap-1">
								<Button
									size="sm"
									onClick={() => onAccept(req.username, ownerSecret)}
								>
									Accept
								</Button>
								<Button
									size="sm"
									variant="destructive"
									onClick={() => onReject(req.username, ownerSecret)}
								>
									Reject
								</Button>
							</div>
						</div>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}

function SettingsDialog({
	roomId,
	ownerSecret,
	voiceActionsEnabled,
	onVoiceActionsChange,
}: {
	roomId: string;
	ownerSecret: string;
	voiceActionsEnabled: boolean;
	onVoiceActionsChange: (enabled: boolean) => void;
}) {
	const [autoAccept, setAutoAccept] = useState(false);
	const [participantLimit, setParticipantLimit] = useState(5);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		fetch(`/api/r/${roomId}/settings`)
			.then((res) => res.json())
			.then((data) => {
				if (data.autoAccept !== undefined) setAutoAccept(data.autoAccept);
				if (data.participantLimit !== undefined)
					setParticipantLimit(data.participantLimit);
				if (data.voiceActionsEnabled !== undefined)
					onVoiceActionsChange(data.voiceActionsEnabled);
			})
			.catch(() => {});
	}, [roomId]);

	const updateAutoAccept = async (next: boolean) => {
		setLoading(true);
		try {
			const res = await fetch(`/api/r/${roomId}/settings`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					"X-Owner-Secret": ownerSecret,
				},
				body: JSON.stringify({ autoAccept: next }),
			});
			if (!res.ok) throw new Error();
			setAutoAccept(next);
			notify("success", {
				title: `Auto-accept ${next ? "enabled" : "disabled"}`,
			});
		} catch {
			notify("error", { title: "Failed to update settings" });
		} finally {
			setLoading(false);
		}
	};

	const updateVoiceActions = async (next: boolean) => {
		setLoading(true);
		try {
			const res = await fetch(`/api/r/${roomId}/settings`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					"X-Owner-Secret": ownerSecret,
				},
				body: JSON.stringify({ voiceActionsEnabled: next }),
			});
			if (!res.ok) throw new Error();
			onVoiceActionsChange(next);
			notify("success", {
				title: `Voice actions ${next ? "enabled" : "disabled"}`,
			});
		} catch {
			notify("error", { title: "Failed to update settings" });
		} finally {
			setLoading(false);
		}
	};

	const updateParticipantLimit = async (next: number) => {
		if (!Number.isInteger(next) || next < 1 || next > 100) return;
		setLoading(true);
		try {
			const res = await fetch(`/api/r/${roomId}/settings`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					"X-Owner-Secret": ownerSecret,
				},
				body: JSON.stringify({ participantLimit: next }),
			});
			if (!res.ok) throw new Error();
			setParticipantLimit(next);
			notify("success", { title: `Participant limit set to ${next}` });
		} catch {
			notify("error", { title: "Failed to update participant limit" });
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog>
			<DialogTrigger
				render={
					<Button
						variant="secondary"
						size="icon"
						className="rounded-full h-12 w-12"
						title="Room settings"
					/>
				}
			>
				<Settings className="h-5 w-5" />
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Room Settings</DialogTitle>
				</DialogHeader>
				<div className="flex items-center justify-between py-2">
					<div className="space-y-0.5">
						<p className="text-sm font-medium">Auto-accept participants</p>
						<p className="text-xs text-muted-foreground">
							When off, you must approve each person before they can join.
						</p>
					</div>
					<Switch
						className="shrink-0"
						checked={autoAccept}
						onCheckedChange={(checked) => void updateAutoAccept(checked)}
						disabled={loading}
						aria-label="Auto-accept participants"
					/>
				</div>
				<div className="flex items-center justify-between py-2">
					<div className="space-y-0.5">
						<p className="text-sm font-medium">Participant limit</p>
						<p className="text-xs text-muted-foreground">
							Maximum number of people who can join this room.
						</p>
					</div>
					<Input
						type="number"
						min={1}
						max={100}
						value={participantLimit}
						onChange={(e) => {
							const val = parseInt(e.target.value, 10);
							if (!isNaN(val)) setParticipantLimit(val);
						}}
						onBlur={() => void updateParticipantLimit(participantLimit)}
						disabled={loading}
						className="w-20 text-center shrink-0"
						aria-label="Participant limit"
					/>
				</div>
				<div className="flex items-center justify-between py-2">
					<div className="space-y-0.5">
						<p className="text-sm font-medium">Voice actions</p>
						<p className="text-xs text-muted-foreground">
							AI automatically detects and executes actionable requests from the
							conversation.
						</p>
					</div>
					<Switch
						className="shrink-0"
						checked={voiceActionsEnabled}
						onCheckedChange={(checked) => void updateVoiceActions(checked)}
						disabled={loading}
						aria-label="Voice actions"
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}
