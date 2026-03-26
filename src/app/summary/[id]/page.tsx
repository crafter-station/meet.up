import { db } from "@/db";
import { meetingSummaries, rooms } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { eq } from "drizzle-orm";
import { CheckCircle2, FileText, Home } from "lucide-react";
import Link from "next/link";

export default async function SummaryPage({
	params,
	searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ sent?: string }>;
}) {
	const { id } = await params;
	const { sent } = await searchParams;

	const room = await db.query.rooms.findFirst({
		where: eq(rooms.dailyRoomName, id),
	});

	if (!room) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
				<p className="text-muted-foreground">Meeting not found</p>
				<Link href="/">
					<Button variant="secondary">
						<Home className="h-4 w-4 mr-2" />
						Back to home
					</Button>
				</Link>
			</div>
		);
	}

	const summary = await db.query.meetingSummaries.findFirst({
		where: eq(meetingSummaries.roomId, room.id),
	});

	if (!summary) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
				<FileText className="h-12 w-12 text-muted-foreground" />
				<p className="text-muted-foreground">No summary available for this meeting</p>
				<Link href="/">
					<Button variant="secondary">
						<Home className="h-4 w-4 mr-2" />
						Start a new meeting
					</Button>
				</Link>
			</div>
		);
	}

	const keyTopics: string[] = JSON.parse(summary.keyTopics);
	const actionItems: string[] = JSON.parse(summary.actionItems);
	const decisions: string[] = JSON.parse(summary.decisions);
	const meetingDate = room.endedAt ?? room.createdAt;

	return (
		<div className="flex flex-1 flex-col items-center px-4 py-8">
			<div className="w-full max-w-2xl space-y-6">
				{sent === "true" && (
					<div className="flex items-center gap-2 rounded-lg border border-green-800 bg-green-950/50 px-4 py-3 text-sm text-green-300">
						<CheckCircle2 className="h-4 w-4 shrink-0" />
						Meeting notes have been sent to your email
					</div>
				)}

				<div className="space-y-1">
					<h1 className="text-2xl font-bold tracking-tight">
						{summary.title}
					</h1>
					<p className="text-sm text-muted-foreground">
						{id} &middot;{" "}
						{meetingDate.toLocaleDateString("en-US", {
							weekday: "long",
							year: "numeric",
							month: "long",
							day: "numeric",
						})}
					</p>
				</div>

				<div className="space-y-2">
					<h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
						Summary
					</h2>
					<p className="text-foreground leading-relaxed whitespace-pre-line">
						{summary.summary}
					</p>
				</div>

				{keyTopics.length > 0 && (
					<div className="space-y-2">
						<h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
							Key Topics
						</h2>
						<ul className="list-disc list-inside space-y-1 text-foreground">
							{keyTopics.map((topic) => (
								<li key={topic}>{topic}</li>
							))}
						</ul>
					</div>
				)}

				{actionItems.length > 0 && (
					<div className="space-y-2">
						<h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
							Action Items
						</h2>
						<ul className="list-disc list-inside space-y-1 text-foreground">
							{actionItems.map((item) => (
								<li key={item}>{item}</li>
							))}
						</ul>
					</div>
				)}

				{decisions.length > 0 && (
					<div className="space-y-2">
						<h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
							Decisions
						</h2>
						<ul className="list-disc list-inside space-y-1 text-foreground">
							{decisions.map((decision) => (
								<li key={decision}>{decision}</li>
							))}
						</ul>
					</div>
				)}

				<div className="pt-4 border-t border-border">
					<Link href="/">
						<Button>
							<Home className="h-4 w-4 mr-2" />
							Start a new meeting
						</Button>
					</Link>
				</div>
			</div>
		</div>
	);
}
