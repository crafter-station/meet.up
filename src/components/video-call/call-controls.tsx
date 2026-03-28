"use client";

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
import type { PendingRequest } from "@/hooks/use-admission";
import { useUser } from "@clerk/nextjs";
import {
  useDaily,
  useDevices,
  useLocalSessionId,
  useParticipantProperty,
} from "@daily-co/daily-react";
import {
  Captions,
  Loader2,
  MessageSquare,
  PhoneOff,
  Settings,
  Square,
  UserCheck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
}

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
        <Captions className="h-5 w-5" />
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
            <SettingsDialog roomId={roomId} ownerSecret={ownerSecret!} />
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
            <SettingsDialog roomId={roomId} ownerSecret={ownerSecret!} />
          </FloatingMenu>
        </>
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
}: {
  roomId: string;
  ownerSecret: string;
}) {
  const [autoAccept, setAutoAccept] = useState(true);
  const [loading, setLoading] = useState(false);

  // Fetch current setting on mount
  useEffect(() => {
    // The setting defaults to true; no dedicated GET endpoint, so we use the local state.
    // It stays in sync because only the owner can change it.
  }, []);

  const toggle = async () => {
    setLoading(true);
    const next = !autoAccept;
    try {
      await fetch(`/api/r/${roomId}/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Owner-Secret": ownerSecret,
        },
        body: JSON.stringify({ autoAccept: next }),
      });
      setAutoAccept(next);
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
          <Button
            variant={autoAccept ? "default" : "secondary"}
            size="sm"
            onClick={toggle}
            disabled={loading}
          >
            {autoAccept ? "On" : "Off"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
