"use client";

import { CamToggle, MicToggle } from "@/components/media-toggles";
import { VideoOff } from "lucide-react";
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
				<MicToggle
					isOn={micOn}
					onToggle={() => setMicOn((prev) => !prev)}
					devices={mics}
					selectedDeviceId={selectedMic}
					onSelectDevice={setSelectedMic}
				/>
				<CamToggle
					isOn={camOn}
					onToggle={() => setCamOn((prev) => !prev)}
					devices={cameras}
					selectedDeviceId={selectedCam}
					onSelectDevice={setSelectedCam}
				/>
			</div>
		</div>
	);
}
