"use client";

import { Button } from "@/components/ui/button";
import {
	ChevronDown,
	Mic,
	MicOff,
	Video,
	VideoOff,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface MediaDevice {
	deviceId: string;
	label: string;
}

export interface MediaSettings {
	camOn: boolean;
	micOn: boolean;
	selectedCamId: string;
	selectedMicId: string;
}

interface MediaPreviewProps {
	onSettingsChange?: (settings: MediaSettings) => void;
}

export function MediaPreview({ onSettingsChange }: MediaPreviewProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const streamRef = useRef<MediaStream | null>(null);

	const [camOn, setCamOn] = useState(true);
	const [micOn, setMicOn] = useState(true);

	const [cameras, setCameras] = useState<MediaDevice[]>([]);
	const [mics, setMics] = useState<MediaDevice[]>([]);
	const [selectedCam, setSelectedCam] = useState("");
	const [selectedMic, setSelectedMic] = useState("");

	const [showCamMenu, setShowCamMenu] = useState(false);
	const [showMicMenu, setShowMicMenu] = useState(false);

	const [permissionDenied, setPermissionDenied] = useState(false);

	// Enumerate devices
	const enumerateDevices = useCallback(async () => {
		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			const videoDevices = devices
				.filter((d) => d.kind === "videoinput" && d.deviceId)
				.map((d) => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 4)}` }));
			const audioDevices = devices
				.filter((d) => d.kind === "audioinput" && d.deviceId)
				.map((d) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 4)}` }));

			setCameras(videoDevices);
			setMics(audioDevices);

			if (!selectedCam && videoDevices.length > 0) {
				setSelectedCam(videoDevices[0].deviceId);
			}
			if (!selectedMic && audioDevices.length > 0) {
				setSelectedMic(audioDevices[0].deviceId);
			}
		} catch {
			// ignore enumeration errors
		}
	}, [selectedCam, selectedMic]);

	// Start/restart stream
	const startStream = useCallback(async () => {
		// Stop existing stream
		if (streamRef.current) {
			for (const track of streamRef.current.getTracks()) {
				track.stop();
			}
			streamRef.current = null;
		}

		if (!camOn && !micOn) {
			if (videoRef.current) videoRef.current.srcObject = null;
			return;
		}

		try {
			const constraints: MediaStreamConstraints = {};
			if (camOn) {
				constraints.video = selectedCam
					? { deviceId: { exact: selectedCam } }
					: true;
			}
			if (micOn) {
				constraints.audio = selectedMic
					? { deviceId: { exact: selectedMic } }
					: true;
			}

			const stream = await navigator.mediaDevices.getUserMedia(constraints);
			streamRef.current = stream;
			setPermissionDenied(false);

			if (videoRef.current) {
				videoRef.current.srcObject = camOn ? stream : null;
			}

			// Re-enumerate to get proper labels after permission grant
			await enumerateDevices();
		} catch {
			setPermissionDenied(true);
		}
	}, [camOn, micOn, selectedCam, selectedMic, enumerateDevices]);

	useEffect(() => {
		startStream();
		return () => {
			if (streamRef.current) {
				for (const track of streamRef.current.getTracks()) {
					track.stop();
				}
			}
		};
	}, [startStream]);

	// Notify parent of settings changes
	useEffect(() => {
		onSettingsChange?.({ camOn, micOn, selectedCamId: selectedCam, selectedMicId: selectedMic });
	}, [camOn, micOn, selectedCam, selectedMic, onSettingsChange]);

	const toggleCam = () => {
		setCamOn((prev) => !prev);
		setShowCamMenu(false);
	};

	const toggleMic = () => {
		setMicOn((prev) => !prev);
		setShowMicMenu(false);
	};

	return (
		<div className="w-full max-w-md space-y-3">
			{/* Video preview */}
			<div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted border border-border">
				{camOn && !permissionDenied ? (
					<video
						ref={videoRef}
						autoPlay
						playsInline
						muted
						className="h-full w-full object-cover -scale-x-100"
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center">
						{permissionDenied ? (
							<p className="text-sm text-muted-foreground px-4 text-center">
								Camera access denied. Check your browser permissions.
							</p>
						) : (
							<VideoOff className="h-10 w-10 text-muted-foreground" />
						)}
					</div>
				)}
			</div>

			{/* Controls */}
			<div className="flex items-center justify-center gap-2">
				{/* Mic toggle + selector */}
				<div className="relative">
					<div className="flex">
						<Button
							type="button"
							variant={micOn ? "secondary" : "destructive"}
							size="icon"
							className="rounded-r-none h-10 w-10"
							onClick={toggleMic}
							title={micOn ? "Mute" : "Unmute"}
						>
							{micOn ? (
								<Mic className="h-4 w-4" />
							) : (
								<MicOff className="h-4 w-4" />
							)}
						</Button>
						<Button
							type="button"
							variant={micOn ? "secondary" : "destructive"}
							size="icon"
							className="rounded-l-none border-l border-background/20 h-10 w-6"
							onClick={() => {
								setShowMicMenu((v) => !v);
								setShowCamMenu(false);
							}}
						>
							<ChevronDown className="h-3 w-3" />
						</Button>
					</div>
					{showMicMenu && mics.length > 0 && (
						<div className="absolute bottom-full left-0 mb-2 w-64 rounded-lg border border-border bg-popover p-1 shadow-lg z-20">
							{mics.map((mic) => (
								<button
									key={mic.deviceId}
									type="button"
									className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent ${
										mic.deviceId === selectedMic
											? "bg-accent text-accent-foreground"
											: "text-popover-foreground"
									}`}
									onClick={() => {
										setSelectedMic(mic.deviceId);
										setShowMicMenu(false);
									}}
								>
									{mic.label}
								</button>
							))}
						</div>
					)}
				</div>

				{/* Camera toggle + selector */}
				<div className="relative">
					<div className="flex">
						<Button
							type="button"
							variant={camOn ? "secondary" : "destructive"}
							size="icon"
							className="rounded-r-none h-10 w-10"
							onClick={toggleCam}
							title={camOn ? "Turn off camera" : "Turn on camera"}
						>
							{camOn ? (
								<Video className="h-4 w-4" />
							) : (
								<VideoOff className="h-4 w-4" />
							)}
						</Button>
						<Button
							type="button"
							variant={camOn ? "secondary" : "destructive"}
							size="icon"
							className="rounded-l-none border-l border-background/20 h-10 w-6"
							onClick={() => {
								setShowCamMenu((v) => !v);
								setShowMicMenu(false);
							}}
						>
							<ChevronDown className="h-3 w-3" />
						</Button>
					</div>
					{showCamMenu && cameras.length > 0 && (
						<div className="absolute bottom-full right-0 mb-2 w-64 rounded-lg border border-border bg-popover p-1 shadow-lg z-20">
							{cameras.map((cam) => (
								<button
									key={cam.deviceId}
									type="button"
									className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent ${
										cam.deviceId === selectedCam
											? "bg-accent text-accent-foreground"
											: "text-popover-foreground"
									}`}
									onClick={() => {
										setSelectedCam(cam.deviceId);
										setShowCamMenu(false);
									}}
								>
									{cam.label}
								</button>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
