"use client";

import { getScheduledMeetings } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScheduleMeetingDialog } from "@/components/schedule-meeting-dialog";
import { getAllIntegrations } from "@/lib/integrations/config";
import { providerIcons } from "@/lib/integrations/icons";
import { notify } from "@/lib/notify";
import { useUser } from "@clerk/nextjs";
import {
	CalendarPlus,
	Clock,
	Copy,
	ExternalLink,
	Loader2,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	OAuthIntegrationCard,
	type ConnectionStatus,
} from "./oauth-integration-card";

type ScheduledMeeting = {
	id: string;
	title: string;
	description: string | null;
	scheduledAt: number;
	createdAt: number;
	roomCode: string;
	roomUrl: string;
	isLive: boolean;
	hasEnded: boolean;
	invitees: Array<{ email: string; emailSent: boolean }>;
};

export function SettingsClient() {
	const { isLoaded } = useUser();
	const [scheduleOpen, setScheduleOpen] = useState(false);
	const [scheduledMeetings, setScheduledMeetings] = useState<
		ScheduledMeeting[]
	>([]);
	const [loadingMeetings, setLoadingMeetings] = useState(true);
	const [connections, setConnections] = useState<ConnectionStatus[]>([]);
	const [meetingListView, setMeetingListView] = useState<
		"upcoming" | "past"
	>("upcoming");
	const [nowMs] = useState(() => Date.now());

	const fetchMeetings = () => {
		setLoadingMeetings(true);
		getScheduledMeetings()
			.then(({ meetings }) =>
				setScheduledMeetings(meetings as ScheduledMeeting[]),
			)
			.finally(() => setLoadingMeetings(false));
	};

	const fetchConnections = useCallback(() => {
		fetch("/api/oauth/status")
			.then((res) => res.json())
			.then((data) => setConnections(data.connections ?? []))
			.catch(() => {});
	}, []);

	useEffect(() => {
		if (!isLoaded) return;
		void Promise.resolve().then(fetchMeetings);
		void Promise.resolve().then(fetchConnections);

		const params = new URLSearchParams(window.location.search);
		const oauthSuccess = params.get("oauth_success");
		const oauthError = params.get("oauth_error");
		if (oauthSuccess) {
			notify("success", { title: `${oauthSuccess} connected successfully` });
			window.history.replaceState({}, "", "/settings");
		}
		if (oauthError) {
			notify("error", { title: `OAuth error: ${oauthError}` });
			window.history.replaceState({}, "", "/settings");
		}
	}, [isLoaded, fetchConnections]);

	const copyCode = (code: string) => {
		navigator.clipboard.writeText(code);
		notify("success", { title: "Room code copied" });
	};

	const { upcomingMeetings, pastMeetings } = useMemo(() => {
		const graceMs = 10 * 60 * 1000;

		const isPast = (m: ScheduledMeeting) =>
			m.hasEnded || (!m.isLive && m.scheduledAt < nowMs - graceMs);

		const upcoming = scheduledMeetings
			.filter((m) => !isPast(m))
			.sort((a, b) => a.scheduledAt - b.scheduledAt);

		const past = scheduledMeetings
			.filter((m) => isPast(m))
			.sort((a, b) => b.scheduledAt - a.scheduledAt);

		return { upcomingMeetings: upcoming, pastMeetings: past };
	}, [scheduledMeetings, nowMs]);

	const visibleMeetings =
		meetingListView === "upcoming" ? upcomingMeetings : pastMeetings;

	if (!isLoaded) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="flex flex-1 flex-col items-center px-4 py-8">
			<div className="w-full max-w-2xl space-y-8">
				<div className="space-y-1">
					<h1 className="text-2xl font-bold tracking-tight">
						Settings
					</h1>
					<p className="text-sm text-muted-foreground">
						Manage your integrations and preferences
					</p>
				</div>

				{/* Scheduled Meetings */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
							Scheduled Meetings
						</h2>
						<div className="flex items-center gap-2">
							<div className="flex items-center rounded-lg border border-border/60 bg-muted/10 p-0.5">
								<Button
									type="button"
									size="sm"
									variant={
										meetingListView === "upcoming"
											? "secondary"
											: "ghost"
									}
									onClick={() =>
										setMeetingListView("upcoming")
									}
									className="h-7 px-2.5"
								>
									Upcoming
									<span className="ml-1.5 text-[10px] text-muted-foreground">
										{upcomingMeetings.length}
									</span>
								</Button>
								<Button
									type="button"
									size="sm"
									variant={
										meetingListView === "past"
											? "secondary"
											: "ghost"
									}
									onClick={() => setMeetingListView("past")}
									className="h-7 px-2.5"
								>
									Past
									<span className="ml-1.5 text-[10px] text-muted-foreground">
										{pastMeetings.length}
									</span>
								</Button>
							</div>

							<Button
								size="sm"
								onClick={() => setScheduleOpen(true)}
							>
								<CalendarPlus className="h-3.5 w-3.5" />
								<span className="ml-1.5">Schedule</span>
							</Button>
						</div>
					</div>

					{loadingMeetings ? (
						<div className="flex justify-center py-6">
							<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
						</div>
					) : scheduledMeetings.length === 0 ? (
						<p className="text-sm text-muted-foreground py-4">
							No scheduled meetings yet.
						</p>
					) : visibleMeetings.length === 0 ? (
						<p className="text-sm text-muted-foreground py-4">
							{meetingListView === "upcoming"
								? "No upcoming meetings."
								: "No past meetings."}
						</p>
					) : (
						<div className="space-y-3">
							{visibleMeetings.map((meeting) => {
								return (
									<div
										key={meeting.id}
										className="rounded-lg border border-border/50 bg-muted/10 p-4"
									>
										<div className="flex items-start justify-between gap-4">
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2">
													<h3 className="text-sm font-medium truncate">
														{meeting.title}
													</h3>
													{meeting.isLive && (
														<span className="flex items-center gap-1 text-[10px] text-emerald-400 shrink-0">
															<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
															Live
														</span>
													)}
													{meeting.hasEnded && (
														<Badge
															variant="outline"
															className="text-[10px] shrink-0"
														>
															Ended
														</Badge>
													)}
												</div>
												<p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
													<Clock className="h-3 w-3" />
													{new Date(
														meeting.scheduledAt,
													).toLocaleString(
														undefined,
														{
															month: "short",
															day: "numeric",
															hour: "numeric",
															minute: "2-digit",
														},
													)}
												</p>
												{meeting.description && (
													<p className="text-xs text-muted-foreground mt-1 line-clamp-1">
														{meeting.description}
													</p>
												)}
												<div className="flex items-center gap-3 mt-2">
													<Badge
														variant="outline"
														className="text-[10px] font-mono"
													>
														{meeting.roomCode}
													</Badge>
													<button
														type="button"
														onClick={() =>
															copyCode(
																meeting.roomCode,
															)
														}
														className="text-muted-foreground hover:text-foreground transition-colors"
													>
														<Copy className="h-3 w-3" />
													</button>
													<span className="flex items-center gap-1 text-xs text-muted-foreground">
														<Users className="h-3 w-3" />
														{
															meeting.invitees
																.length
														}
													</span>
												</div>
											</div>
											{meetingListView === "upcoming" && (
											<Link href={`/${meeting.roomCode}`}>
												<Button
													variant="outline"
													size="sm"
												>
													<ExternalLink className="h-3.5 w-3.5" />
													<span className="ml-1.5">
														Open
													</span>
												</Button>
											</Link>
										)}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* Integrations */}
				<div className="space-y-4">
					<h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
						Integrations
					</h2>
					{getAllIntegrations().map((config) => {
						const Icon = providerIcons[config.provider];
						const connection =
							connections.find(
								(c) => c.provider === config.provider,
							) ?? null;
						return (
							<OAuthIntegrationCard
								key={config.provider}
								config={config}
								connection={connection}
								icon={<Icon className="h-5 w-5" />}
								onDisconnected={fetchConnections}
							/>
						);
					})}
				</div>
			</div>

			<ScheduleMeetingDialog
				open={scheduleOpen}
				onOpenChange={setScheduleOpen}
				onScheduled={fetchMeetings}
			/>
		</div>
	);
}
