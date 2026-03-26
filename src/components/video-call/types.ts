export interface MediaSettings {
	camOn: boolean;
	micOn: boolean;
	selectedCamId: string;
	selectedMicId: string;
}

export interface VideoCallProps {
	roomUrl: string;
	token: string;
	username: string;
	roomId: string;
	mediaSettings?: MediaSettings;
	isOwner: boolean;
	ownerSecret: string | null;
	onLeaveCall: () => void;
	onOwnershipReceived: (secret: string) => void;
}

export interface ChatMessage {
	id: string;
	username: string;
	content: string;
	timestamp: number;
	type: "chat" | "transcript";
}

export interface TranscriptEntry {
	id: string;
	speaker: string;
	text: string;
	timestamp: number;
}
