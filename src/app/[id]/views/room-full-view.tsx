"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRoomContext } from "../context";

export function RoomFullView() {
	const { cancelWaiting } = useRoomContext();

	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
			<div className="text-center space-y-2">
				<h1 className="text-2xl font-bold tracking-tight">Room is full</h1>
				<p className="text-sm text-muted-foreground">
					This meeting has reached its participant limit. Please try again
					later.
				</p>
			</div>
			<div className="flex gap-2">
				<Button variant="secondary" onClick={cancelWaiting}>
					Try again
				</Button>
				<Link href="/">
					<Button>Back to home</Button>
				</Link>
			</div>
		</div>
	);
}
