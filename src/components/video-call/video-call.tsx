"use client";

import DailyIframe from "@daily-co/daily-js";
import { DailyProvider } from "@daily-co/daily-react";
import { useEffect, useRef, useState } from "react";
import { CallUI } from "./call-ui";
import type { VideoCallProps } from "./types";

// Module-level singleton to handle React Strict Mode double-mounting
let callObjectSingleton: ReturnType<typeof DailyIframe.createCallObject> | null =
	null;

export function VideoCall({
	roomUrl,
	token,
	username,
	roomId,
}: VideoCallProps) {
	const [ready, setReady] = useState(false);
	const coRef = useRef(callObjectSingleton);

	useEffect(() => {
		if (!coRef.current) {
			coRef.current = DailyIframe.createCallObject({
				audioSource: true,
				videoSource: true,
			});
			callObjectSingleton = coRef.current;
		}

		const co = coRef.current;
		co.join({ url: roomUrl, token }).then(() => setReady(true));

		return () => {
			co.leave();
			co.destroy();
			coRef.current = null;
			callObjectSingleton = null;
		};
	}, [roomUrl, token]);

	if (!ready || !coRef.current) {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<p className="text-muted-foreground animate-pulse">Joining call...</p>
			</div>
		);
	}

	return (
		<DailyProvider callObject={coRef.current}>
			<CallUI username={username} roomId={roomId} />
		</DailyProvider>
	);
}
