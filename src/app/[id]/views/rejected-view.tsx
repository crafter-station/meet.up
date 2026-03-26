"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export function RejectedView() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
			<div className="text-center space-y-2">
				<h1 className="text-2xl font-bold tracking-tight">Request denied</h1>
				<p className="text-sm text-muted-foreground">
					The host did not admit you to this meeting.
				</p>
			</div>
			<Link href="/">
				<Button>Back to home</Button>
			</Link>
		</div>
	);
}
