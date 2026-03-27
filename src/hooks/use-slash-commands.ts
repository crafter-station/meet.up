import { commands, type CommandContext, type SlashCommand } from "@/lib/commands";
import type { ChatMessage } from "@/components/video-call/types";
import { useCallback, useMemo, useRef, useState } from "react";

interface UseSlashCommandsOptions {
	roomId: string;
	username: string;
	messages: ChatMessage[];
	sendMessage: (content: string) => void;
	sendMessageAs: (content: string, asUsername: string) => void;
}

export function useSlashCommands({
	roomId,
	username,
	messages,
	sendMessage,
	sendMessageAs,
}: UseSlashCommandsOptions) {
	const [isOpen, setIsOpen] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [isExecuting, setIsExecuting] = useState(false);
	const queryRef = useRef("");
	const inputRef = useRef("");

	const filteredCommands = useMemo(() => {
		const q = queryRef.current;
		if (!q && isOpen) return commands;
		return commands.filter((c) => c.name.startsWith(q));
	}, [isOpen]);

	const handleInputChange = useCallback((value: string) => {
		inputRef.current = value;
		if (value.startsWith("/")) {
			const query = value.slice(1).split(" ")[0];
			queryRef.current = query;
			setIsOpen(true);
			setSelectedIndex(0);
		} else {
			queryRef.current = "";
			setIsOpen(false);
		}
	}, []);

	const executeCommand = useCallback(
		async (cmd: SlashCommand, args: string) => {
			setIsExecuting(true);
			try {
				const ctx: CommandContext = {
					roomId,
					username,
					messages,
					sendMessage,
					sendMessageAs,
				};
				await cmd.execute(ctx, args);
			} finally {
				setIsExecuting(false);
			}
		},
		[roomId, username, messages, sendMessage, sendMessageAs],
	);

	const selectCommand = useCallback(
		(cmd: SlashCommand, args = "") => {
			setIsOpen(false);
			queryRef.current = "";
			executeCommand(cmd, args);
		},
		[executeCommand],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (!isOpen) return false;

			const cmds = commands.filter((c) =>
				c.name.startsWith(queryRef.current),
			);

			if (e.key === "ArrowDown") {
				setSelectedIndex((i) => Math.min(i + 1, cmds.length - 1));
				return true;
			}
			if (e.key === "ArrowUp") {
				setSelectedIndex((i) => Math.max(i - 1, 0));
				return true;
			}
			if (e.key === "Enter" && cmds.length > 0) {
				const cmd = cmds[selectedIndex] ?? cmds[0];
				const afterSlash = inputRef.current.slice(1);
				const spaceIdx = afterSlash.indexOf(" ");
				const args =
					spaceIdx !== -1 ? afterSlash.slice(spaceIdx + 1).trim() : "";
				selectCommand(cmd, args);
				return true;
			}
			if (e.key === "Escape") {
				setIsOpen(false);
				return true;
			}

			return false;
		},
		[isOpen, selectedIndex, selectCommand],
	);

	return {
		isOpen,
		filteredCommands,
		selectedIndex,
		isExecuting,
		handleInputChange,
		handleKeyDown,
		selectCommand,
	};
}
