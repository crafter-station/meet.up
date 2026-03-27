import type { SlashCommand } from "@/lib/commands";
import { useEffect, useRef } from "react";

interface SlashCommandMenuProps {
	commands: SlashCommand[];
	selectedIndex: number;
	onSelect: (command: SlashCommand) => void;
}

export function SlashCommandMenu({
	commands,
	selectedIndex,
	onSelect,
}: SlashCommandMenuProps) {
	const selectedRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		selectedRef.current?.scrollIntoView({ block: "nearest" });
	}, [selectedIndex]);

	return (
		<div className="absolute bottom-full left-0 mb-2 w-full max-h-48 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg z-20">
			{commands.map((cmd, i) => (
				<button
					key={cmd.name}
					ref={i === selectedIndex ? selectedRef : undefined}
					type="button"
					className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
						i === selectedIndex
							? "bg-accent text-accent-foreground"
							: "text-popover-foreground hover:bg-accent/50"
					}`}
					onMouseDown={(e) => {
						e.preventDefault();
						onSelect(cmd);
					}}
				>
					<span className="font-medium">/{cmd.name}</span>
					<span className="ml-2 text-xs text-muted-foreground">
						{cmd.description}
					</span>
				</button>
			))}
		</div>
	);
}
