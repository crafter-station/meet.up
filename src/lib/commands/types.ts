import type { ChatMessage } from "@/components/video-call/types";

export interface CommandContext {
	roomId: string;
	username: string;
	messages: ChatMessage[];
	sendMessage: (content: string) => void;
	sendMessageAs: (content: string, asUsername: string) => void;
}

export interface CommandParam {
	name: string;
	description: string;
	required?: boolean;
}

export interface SlashCommand {
	name: string;
	description: string;
	params?: CommandParam[];
	execute: (ctx: CommandContext, args: string) => Promise<void>;
}
