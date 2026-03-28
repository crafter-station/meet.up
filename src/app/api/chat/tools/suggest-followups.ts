import { tool } from "ai";
import { z } from "zod";

const description =
  "Generate 3-4 short follow-up suggestions for the user based on the current conversation context. Always call this tool at the end of every response.";

const inputSchema = z.object({
  title: z
    .string()
    .describe(
      "A short contextual title for the suggestions based on the conversation (e.g. 'Dive into action items', 'More on the budget')",
    ),
  suggestions: z
    .array(z.string().describe("A short follow-up suggestion (max 6 words)"))
    .min(3)
    .max(4),
});

export const suggestFollowups = tool({
  description,
  inputSchema,
  execute: async ({ title, suggestions }) => ({ title, suggestions }),
});
