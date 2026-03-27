import { saySomething } from "./say-something";
import type { SlashCommand } from "./types";

export type { SlashCommand, CommandContext, CommandParam } from "./types";

export const commands: SlashCommand[] = [saySomething];
