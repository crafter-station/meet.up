/**
 * In-memory cache for summary data.
 * Enables instant revisits when switching between meetings in the sidebar.
 */

export type CachedSummary = {
	title: string;
	summary: string;
};

const cache = new Map<string, CachedSummary>();
const inflight = new Set<string>();

export function getCachedSummary(roomId: string): CachedSummary | null {
	return cache.get(roomId) ?? null;
}

export function setCachedSummary(roomId: string, data: CachedSummary): void {
	cache.set(roomId, data);
}

/**
 * Prefetch summary data for a room.
 * No-ops if already cached or in-flight.
 */
export async function prefetchSummary(roomId: string): Promise<void> {
	if (cache.has(roomId) || inflight.has(roomId)) return;

	inflight.add(roomId);
	try {
		const res = await fetch("/api/summary", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ roomId }),
		});

		if (!res.ok) return;

		const contentType = res.headers.get("content-type") ?? "";
		if (contentType.includes("application/json")) {
			const data = await res.json();
			cache.set(roomId, {
				title: data.title ?? "Meeting Summary",
				summary: data.summary,
			});
		} else {
			// Streaming response — read it fully and cache the result
			const reader = res.body?.getReader();
			if (!reader) return;

			const title = res.headers.get("X-Meeting-Title");
			const decoder = new TextDecoder();
			let text = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				text += decoder.decode(value, { stream: true });
			}

			cache.set(roomId, {
				title: title ? decodeURIComponent(title) : "Meeting Summary",
				summary: text,
			});
		}
	} finally {
		inflight.delete(roomId);
	}
}
