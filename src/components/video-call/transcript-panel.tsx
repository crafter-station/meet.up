"use client";

import { Captions } from "lucide-react";

export function TranscriptPanel() {
	return (
		<div className="flex h-full flex-col">
			<div className="border-b border-border px-4 py-3">
				<h3 className="text-sm font-semibold">Transcription</h3>
			</div>

			<div className="flex flex-1 items-center justify-center p-4">
				<div className="text-center text-muted-foreground">
					<Captions className="mx-auto mb-3 h-10 w-10 opacity-50" />
					<p className="text-sm">Transcription will appear here</p>
					<p className="text-xs mt-1 opacity-70">Coming soon</p>
				</div>
			</div>
		</div>
	);
}
