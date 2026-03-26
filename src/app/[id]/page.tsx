"use client";

import { useParams } from "next/navigation";
import { RoomProvider, useRoomContext } from "./context";
import { PreviewView } from "./views/preview-view";
import { WaitingView } from "./views/waiting-view";
import { InCallView } from "./views/in-call-view";
import { RejectedView } from "./views/rejected-view";
import { EndedView } from "./views/ended-view";

export default function RoomPage() {
	const { id } = useParams<{ id: string }>();

	return (
		<RoomProvider roomId={id}>
			<RoomRouter />
		</RoomProvider>
	);
}

function RoomRouter() {
	const { state } = useRoomContext();

	switch (state.status) {
		case "preview":
		case "joining":
		case "error":
			return <PreviewView />;
		case "waiting":
			return <WaitingView />;
		case "in-call":
			return <InCallView token={state.token} roomUrl={state.roomUrl} />;
		case "rejected":
			return <RejectedView />;
		case "ended":
			return <EndedView />;
	}
}
