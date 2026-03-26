"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRoomContext } from "../context";

export function EndedView() {
	const { roomId } = useRoomContext();

	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
			<div className="text-center space-y-2">
				<h1 className="text-2xl font-bold tracking-tight">Meeting ended</h1>
				<p className="text-sm text-muted-foreground">
					This meeting has already ended
				</p>
			</div>
			<div className="flex gap-2">
				<Link href={`/summary/${roomId}`}>
					<Button variant="secondary">View summary</Button>
				</Link>
				<Link href="/">
					<Button>Start a new meeting</Button>
				</Link>
			</div>
		</div>
	);
}
