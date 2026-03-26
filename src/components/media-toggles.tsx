"use client";

import { Button } from "@/components/ui/button";
import {
	ChevronDown,
	Mic,
	MicOff,
	Video,
	VideoOff,
} from "lucide-react";
import { useState } from "react";

interface MediaDevice {
	deviceId: string;
	label: string;
}

interface MediaToggleProps {
	isOn: boolean;
	onToggle: () => void;
	devices: MediaDevice[];
	selectedDeviceId: string;
	onSelectDevice: (deviceId: string) => void;
}

export function MicToggle({
	isOn,
	onToggle,
	devices,
	selectedDeviceId,
	onSelectDevice,
}: MediaToggleProps) {
	const [showMenu, setShowMenu] = useState(false);

	return (
		<div className="relative">
			<div className="flex">
				<Button
					type="button"
					variant={isOn ? "secondary" : "destructive"}
					size="icon"
					className="rounded-r-none h-10 w-10"
					onClick={() => {
						onToggle();
						setShowMenu(false);
					}}
					title={isOn ? "Mute" : "Unmute"}
				>
					{isOn ? (
						<Mic className="h-4 w-4" />
					) : (
						<MicOff className="h-4 w-4" />
					)}
				</Button>
				<Button
					type="button"
					variant={isOn ? "secondary" : "destructive"}
					size="icon"
					className="rounded-l-none border-l border-background/20 h-10 w-6"
					onClick={() => setShowMenu((v) => !v)}
				>
					<ChevronDown className="h-3 w-3" />
				</Button>
			</div>
			{showMenu && devices.length > 0 && (
				<div className="absolute bottom-full left-0 mb-2 w-64 rounded-lg border border-border bg-popover p-1 shadow-lg z-20">
					{devices.map((d) => (
						<button
							key={d.deviceId}
							type="button"
							className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent ${
								d.deviceId === selectedDeviceId
									? "bg-accent text-accent-foreground"
									: "text-popover-foreground"
							}`}
							onClick={() => {
								onSelectDevice(d.deviceId);
								setShowMenu(false);
							}}
						>
							{d.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

export function CamToggle({
	isOn,
	onToggle,
	devices,
	selectedDeviceId,
	onSelectDevice,
}: MediaToggleProps) {
	const [showMenu, setShowMenu] = useState(false);

	return (
		<div className="relative">
			<div className="flex">
				<Button
					type="button"
					variant={isOn ? "secondary" : "destructive"}
					size="icon"
					className="rounded-r-none h-10 w-10"
					onClick={() => {
						onToggle();
						setShowMenu(false);
					}}
					title={isOn ? "Turn off camera" : "Turn on camera"}
				>
					{isOn ? (
						<Video className="h-4 w-4" />
					) : (
						<VideoOff className="h-4 w-4" />
					)}
				</Button>
				<Button
					type="button"
					variant={isOn ? "secondary" : "destructive"}
					size="icon"
					className="rounded-l-none border-l border-background/20 h-10 w-6"
					onClick={() => setShowMenu((v) => !v)}
				>
					<ChevronDown className="h-3 w-3" />
				</Button>
			</div>
			{showMenu && devices.length > 0 && (
				<div className="absolute bottom-full right-0 mb-2 w-64 rounded-lg border border-border bg-popover p-1 shadow-lg z-20">
					{devices.map((d) => (
						<button
							key={d.deviceId}
							type="button"
							className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent ${
								d.deviceId === selectedDeviceId
									? "bg-accent text-accent-foreground"
									: "text-popover-foreground"
							}`}
							onClick={() => {
								onSelectDevice(d.deviceId);
								setShowMenu(false);
							}}
						>
							{d.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
