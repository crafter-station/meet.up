"use client";

import { getUserMeetings } from "@/app/actions";
import { useCurrentUser } from "@/hooks/use-current-user";
import { SignInButton, UserButton } from "@clerk/nextjs";
import {
	CalendarPlus,
	Clock,
	LogInIcon,
	Plus,
	Settings,
	Sparkles,
	Users,
	Video,
} from "lucide-react";
import { ScheduleMeetingDialog } from "@/components/schedule-meeting-dialog";
import { prefetchSummary } from "@/lib/summary-cache";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarSeparator,
} from "@/components/ui/sidebar";

type Meeting = {
	roomId: string;
	dailyRoomName: string;
	createdAt: number;
	endedAt: number | null;
	isLive: boolean;
	title: string | null;
	summary: string | null;
	participantNames: string[];
	participantCount: number;
};

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
	const { fingerprintId, clerkId, isAuthenticated, isLoading } =
		useCurrentUser();
	const [meetings, setMeetings] = useState<Meeting[]>([]);
	const [scheduleOpen, setScheduleOpen] = useState(false);
	const pathname = usePathname();
	const router = useRouter();

	useEffect(() => {
		if (isLoading) return;
		if (!fingerprintId && !clerkId) return;

		getUserMeetings(fingerprintId, clerkId ?? null).then(({ meetings }) => {
			setMeetings(meetings as Meeting[]);

			// Eager prefetch: warm cache for top 5 ended meetings
			const ended = (meetings as Meeting[]).filter((m) => !m.isLive);
			for (const m of ended.slice(0, 5)) {
				prefetchSummary(m.dailyRoomName);
			}
		});
	}, [isLoading, fingerprintId, clerkId]);

	const createRoom = async () => {
		const res = await fetch("/api/r", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ fingerprintId }),
		});
		if (!res.ok) return;
		const { id, ownerSecret } = await res.json();
		sessionStorage.setItem(`ownerSecret:${id}`, ownerSecret);
		router.push(`/${id}`);
	};

	// Extract current summary room from pathname
	const summaryMatch = pathname.match(/^\/summary\/(.+)$/);
	const activeRoomName = summaryMatch?.[1] ?? null;

	const liveMeetings = meetings.filter((m) => m.isLive);
	const pastMeetings = meetings.filter((m) => !m.isLive);

	return (
	<>
		<Sidebar collapsible="offcanvas" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							render={<Link href="/" />}
							className="data-[slot=sidebar-menu-button]:!p-1.5"
						>
							<Video className="h-4 w-4" />
							<span className="text-base font-semibold tracking-tight">
								meet.up
							</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							onClick={createRoom}
							className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
						>
							<Plus className="size-4" />
							<span>New meeting</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
					{isAuthenticated && (
						<SidebarMenuItem>
							<SidebarMenuButton
								onClick={() => setScheduleOpen(true)}
							>
								<CalendarPlus className="size-4" />
								<span>Schedule meeting</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					)}
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent>
				{/* Live meetings */}
				{liveMeetings.length > 0 && (
					<SidebarGroup>
						<SidebarGroupLabel>Live</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{liveMeetings.map((meeting) => (
									<SidebarMenuItem key={meeting.roomId}>
										<SidebarMenuButton
											render={
												<Link href={`/${meeting.dailyRoomName}`} />
											}
											className="h-auto py-2"
										>
											<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
											<span className="truncate">
												{meeting.title ?? meeting.dailyRoomName}
											</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				)}

				{/* Past meetings */}
				<SidebarGroup>
					<SidebarGroupLabel>Meetings</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{pastMeetings.length === 0 && !isLoading && (
								<p className="px-2 py-4 text-xs text-muted-foreground">
									No meetings yet
								</p>
							)}
							{pastMeetings.map((meeting) => (
								<SidebarMenuItem key={meeting.roomId}>
									<SidebarMenuButton
										render={
											<Link
												href={`/summary/${meeting.dailyRoomName}`}
											/>
										}
										onMouseEnter={() =>
											prefetchSummary(meeting.dailyRoomName)
										}
										isActive={
											activeRoomName === meeting.dailyRoomName
										}
										className="h-auto py-2 [&_svg]:shrink-0"
									>
										<Sparkles className="size-4" />
										<div className="flex flex-col gap-0.5 min-w-0">
											<span className="truncate text-sm">
												{meeting.title ?? meeting.dailyRoomName}
											</span>
											<span className="flex items-center gap-2 text-[10px] text-muted-foreground [&_svg]:size-2.5">
												<span className="flex items-center gap-1">
													<Users />
													{meeting.participantCount}
												</span>
												<span className="flex items-center gap-1">
													<Clock />
													{new Date(
														meeting.createdAt,
													).toLocaleDateString(undefined, {
														month: "short",
														day: "numeric",
													})}
												</span>
											</span>
										</div>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarSeparator />
			<SidebarFooter>
				<SidebarMenu>
					{isAuthenticated && (
						<SidebarMenuItem>
							<SidebarMenuButton
								render={<Link href="/settings" />}
								isActive={pathname === "/settings"}
							>
								<Settings className="size-4" />
								<span>Settings</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					)}
					<SidebarMenuItem>
						{isAuthenticated ? (
							<div className="flex items-center gap-2 px-2 py-1.5">
								<UserButton
									appearance={{
										elements: { avatarBox: "size-5" },
									}}
								/>
								<span className="text-sm">Account</span>
							</div>
						) : (
							<SignInButton mode="modal">
								<SidebarMenuButton>
									<LogInIcon />
									<span>Sign in</span>
								</SidebarMenuButton>
							</SignInButton>
						)}
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>

		<ScheduleMeetingDialog
			open={scheduleOpen}
			onOpenChange={setScheduleOpen}
		/>
	</>
	);
}
