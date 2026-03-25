export interface VideoCallProps {
	roomUrl: string;
	token: string;
	username: string;
	roomId: string;
}

export interface ChatMessage {
	id: string;
	username: string;
	content: string;
	timestamp: number;
}

export interface TranscriptEntry {
	id: string;
	speaker: string;
	text: string;
	timestamp: number;
}
