"use client";

import { VideoCall } from "@/components/video-call/video-call";
import { useRoomContext } from "../context";

export function InCallView({
	token,
	roomUrl,
}: {
	token: string;
	roomUrl: string;
}) {
	const {
		username,
		roomId,
		mediaSettings,
		isOwner,
		ownerSecret,
		leaveCall,
		updateOwnership,
	} = useRoomContext();

	return (
		<div className="flex h-dvh">
			<VideoCall
				roomUrl={roomUrl}
				token={token}
				username={username.trim()}
				roomId={roomId}
				mediaSettings={mediaSettings}
				isOwner={isOwner}
				ownerSecret={ownerSecret}
				onLeaveCall={leaveCall}
				onOwnershipReceived={updateOwnership}
			/>
		</div>
	);
}
