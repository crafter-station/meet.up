"use client";

import DailyIframe from "@daily-co/daily-js";
import { DailyProvider } from "@daily-co/daily-react";
import { useEffect, useState } from "react";
import { CallUI } from "./call-ui";
import type { VideoCallProps } from "./types";

// Track the pending destroy so the next mount waits for it
let destroyPromise: Promise<void> = Promise.resolve();

export function VideoCall({
	roomUrl,
	token,
	username,
	roomId,
	mediaSettings,
	isOwner,
	ownerSecret,
	onLeaveCall,
	onOwnershipReceived,
}: VideoCallProps) {
	const [callObject, setCallObject] = useState<ReturnType<
		typeof DailyIframe.createCallObject
	> | null>(null);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		let cancelled = false;
		let co: ReturnType<typeof DailyIframe.createCallObject> | null = null;

		// Wait for any previous instance to fully destroy before creating a new one
		const init = destroyPromise.then(() => {
			if (cancelled) return;

			// Always acquire devices so they can be toggled later.
			// Passing false permanently disables the track in Daily.
			co = DailyIframe.createCallObject({
				audioSource: mediaSettings?.selectedMicId || true,
				videoSource: mediaSettings?.selectedCamId || true,
			});

			setCallObject(co);

			return co.join({ url: roomUrl, token }).then(() => {
				if (cancelled || !co) return;
				// Apply mute state from the pre-join preview
				if (mediaSettings?.micOn === false) co.setLocalAudio(false);
				if (mediaSettings?.camOn === false) co.setLocalVideo(false);
				setReady(true);
			});
		});

		return () => {
			cancelled = true;
			destroyPromise = init.then(() => {
				if (co) {
					return co
						.leave()
						.then(() => co!.destroy())
						.catch(() => {});
				}
			});
			setCallObject(null);
			setReady(false);
		};
	}, [roomUrl, token]);

	if (!ready || !callObject) {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<p className="text-muted-foreground animate-pulse">Joining call...</p>
			</div>
		);
	}

	return (
		<DailyProvider callObject={callObject}>
			<CallUI
				username={username}
				roomId={roomId}
				isOwner={isOwner}
				ownerSecret={ownerSecret}
				onLeaveCall={onLeaveCall}
				onOwnershipReceived={onOwnershipReceived}
			/>
		</DailyProvider>
	);
}
