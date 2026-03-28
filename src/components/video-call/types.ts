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

// ── Feed items ──────────────────────────────────────────────────

interface FeedItemBase {
	id: string;
	username: string;
	title?: string;
	content: string;
	createdAt: number;
	updatedAt: number;
}

export interface ArtifactFeedItem extends FeedItemBase {
	type: "artifact";
	metadata?: string;
	generatingTitle?: boolean;
}

export interface NoteFeedItem extends FeedItemBase {
	type: "note";
}

export interface ActionItemFeedItem extends FeedItemBase {
	type: "action_item";
	isDone: boolean;
}

export type FeedItem = ArtifactFeedItem | NoteFeedItem | ActionItemFeedItem;

export type TimelineEntry =
	| { kind: "chat"; data: ChatMessage }
	| { kind: "feed"; data: FeedItem };
