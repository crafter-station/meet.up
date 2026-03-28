"use client";

import { verifySummaryAccess } from "@/app/actions";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Lock, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function AccessGate({
	roomId,
	children,
}: {
	roomId: string;
	children: React.ReactNode;
}) {
	const { fingerprintId, clerkId, isLoading } = useCurrentUser();
	const [allowed, setAllowed] = useState<boolean | null>(null);

	useEffect(() => {
		if (isLoading) return;

		verifySummaryAccess(roomId, fingerprintId, clerkId ?? null).then(
			({ allowed }) => setAllowed(allowed),
		);
	}, [roomId, fingerprintId, clerkId, isLoading]);

	if (isLoading || allowed === null) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-3 px-4">
				<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
				<p className="text-sm text-muted-foreground">Checking access...</p>
			</div>
		);
	}

	if (!allowed) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
				<div className="rounded-full bg-muted/30 p-4">
					<Lock className="h-8 w-8 text-muted-foreground" />
				</div>
				<div className="text-center space-y-1">
					<h2 className="text-lg font-semibold">Private meeting</h2>
					<p className="text-sm text-muted-foreground max-w-sm">
						This summary is only visible to participants. Ask the host to
						make it public if you need access.
					</p>
				</div>
				<Link href="/">
					<Button variant="outline">Back to home</Button>
				</Link>
			</div>
		);
	}

	return <>{children}</>;
}
