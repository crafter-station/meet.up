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
