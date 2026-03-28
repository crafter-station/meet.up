import { tool } from "ai";
import { z } from "zod";

interface FirecrawlResult {
  url: string;
  title: string;
  description: string;
  markdown?: string;
}

const description =
  "Search the web for real-time information. Use this when the user asks about something not covered in the meeting transcription, needs current data, or wants to look up external context.";

const inputSchema = z.object({
  query: z.string().describe("The search query"),
  limit: z
    .number()
    .min(1)
    .max(10)
    .optional()
    .describe("Number of results to return (default 5)"),
});

export const webSearch = tool({
  description,
  inputSchema,
  execute: async ({ query, limit = 5 }) => {
    const res = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        sources: ["web"],
        limit,
        scrapeOptions: {
          onlyMainContent: true,
          maxAge: 172800000,
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Firecrawl search failed (${res.status}): ${text}`);
    }

    const data = await res.json();

    // Firecrawl v2 nests results under data.data.web
    const nested = data?.data;
    const raw = Array.isArray(nested?.web)
      ? nested.web
      : Array.isArray(nested)
        ? nested
        : [];

    const results = (raw as FirecrawlResult[]).slice(0, limit);

    return JSON.stringify(
      results.map((r) => ({
        title: r.title ?? "",
        url: r.url ?? "",
        description: r.description ?? "",
        content: r.markdown?.slice(0, 1000) ?? "",
      })),
    );
  },
});
