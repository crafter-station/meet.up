import { saySomething } from "./say-something";
import { summary } from "./summary";
import { webSearchCommand } from "./web-search";
import type { SlashCommand } from "./types";

export type { SlashCommand, CommandContext, CommandParam } from "./types";

export const commands: SlashCommand[] = [saySomething, summary, webSearchCommand];
