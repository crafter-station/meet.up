"use client";

import { scheduleMeeting, searchClerkUsers } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/use-current-user";
import { notify } from "@/lib/notify";
import { Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type ClerkUserResult = {
	id: string;
	email: string | null;
	firstName: string | null;
	lastName: string | null;
	imageUrl: string;
};

type Invitee = {
	email: string;
	clerkUserId?: string;
	displayName?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatMinDateTime() {
	const now = new Date();
	now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
	return now.toISOString().slice(0, 16);
}

export function ScheduleMeetingDialog({
	open,
	onOpenChange,
	onScheduled,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onScheduled?: () => void;
}) {
	const { fingerprintId } = useCurrentUser();
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [scheduledAt, setScheduledAt] = useState("");
	const [inviteeInput, setInviteeInput] = useState("");
	const [searchResults, setSearchResults] = useState<ClerkUserResult[]>([]);
	const [selectedInvitees, setSelectedInvitees] = useState<Invitee[]>([]);
	const [submitting, setSubmitting] = useState(false);
	const [searching, setSearching] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Debounced user search
	const handleSearchChange = useCallback(
		(value: string) => {
			setInviteeInput(value);
			setSearchResults([]);

			if (debounceRef.current) clearTimeout(debounceRef.current);

			if (value.trim().length < 2) return;

			debounceRef.current = setTimeout(async () => {
				setSearching(true);
				const result = await searchClerkUsers(value);
				if (!result.error) {
					// Filter out already-selected users
					const selected = new Set(
						selectedInvitees.map((i) => i.email),
					);
					setSearchResults(
						(result.users as ClerkUserResult[]).filter(
							(u) => u.email && !selected.has(u.email),
						),
					);
				}
				setSearching(false);
			}, 300);
		},
		[selectedInvitees],
	);

	// Close dropdown on outside click
	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target as Node)
			) {
				setSearchResults([]);
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	// Reset form when dialog closes
	useEffect(() => {
		if (!open) {
			setTitle("");
			setDescription("");
			setScheduledAt("");
			setInviteeInput("");
			setSearchResults([]);
			setSelectedInvitees([]);
		}
	}, [open]);

	const addClerkUser = (user: ClerkUserResult) => {
		if (!user.email) return;
		const name = [user.firstName, user.lastName]
			.filter(Boolean)
			.join(" ");
		setSelectedInvitees((prev) => [
			...prev,
			{
				email: user.email!,
				clerkUserId: user.id,
				displayName: name || undefined,
			},
		]);
		setInviteeInput("");
		setSearchResults([]);
	};

	const addManualEmail = () => {
		const email = inviteeInput.trim();
		if (!EMAIL_REGEX.test(email)) return;
		if (selectedInvitees.some((i) => i.email === email)) return;
		setSelectedInvitees((prev) => [...prev, { email }]);
		setInviteeInput("");
		setSearchResults([]);
	};

	const removeInvitee = (email: string) => {
		setSelectedInvitees((prev) => prev.filter((i) => i.email !== email));
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			if (searchResults.length > 0) {
				addClerkUser(searchResults[0]);
			} else {
				addManualEmail();
			}
		}
	};

	const handleSubmit = async () => {
		setSubmitting(true);
		try {
			const result = await scheduleMeeting({
				title,
				description: description || undefined,
				scheduledAt,
				invitees: selectedInvitees.map((i) => ({
					email: i.email,
					clerkUserId: i.clerkUserId,
				})),
				fingerprintId: fingerprintId ?? undefined,
			});

			if (result.error) {
				notify("error", { title: result.error });
				return;
			}

			if (result.data) {
				sessionStorage.setItem(
					`ownerSecret:${result.data.roomCode}`,
					result.data.ownerSecret,
				);
				notify("success", {
					title: `Meeting scheduled — ${selectedInvitees.length} invite${selectedInvitees.length !== 1 ? "s" : ""} sent`,
				});
				onOpenChange(false);
				onScheduled?.();
			}
		} catch {
			notify("error", { title: "Failed to schedule meeting" });
		} finally {
			setSubmitting(false);
		}
	};

	const canSubmit =
		title.trim() &&
		scheduledAt &&
		selectedInvitees.length > 0 &&
		!submitting;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Schedule a meeting</DialogTitle>
					<DialogDescription>
						Create a room and send invitations.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<Input
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="Meeting title"
						autoFocus
					/>
					<Input
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Description (optional)"
					/>
					<input
						type="datetime-local"
						value={scheduledAt}
						onChange={(e) => setScheduledAt(e.target.value)}
						min={formatMinDateTime()}
						className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
					/>

					{/* Invitee search */}
					<div className="relative" ref={dropdownRef}>
						<Input
							value={inviteeInput}
							onChange={(e) =>
								handleSearchChange(e.target.value)
							}
							onKeyDown={handleKeyDown}
							placeholder="Search users or type an email..."
						/>
						{searching && (
							<Loader2 className="absolute right-2.5 top-2 h-4 w-4 animate-spin text-muted-foreground" />
						)}
						{searchResults.length > 0 && (
							<div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-popover p-1 shadow-md">
								{searchResults.map((user) => (
									<button
										type="button"
										key={user.id}
										onClick={() => addClerkUser(user)}
										className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted transition-colors"
									>
										<img
											src={user.imageUrl}
											alt=""
											className="h-5 w-5 rounded-full"
										/>
										<span className="truncate">
											{[
												user.firstName,
												user.lastName,
											]
												.filter(Boolean)
												.join(" ") || user.email}
										</span>
										{user.email && (
											<span className="ml-auto text-xs text-muted-foreground truncate">
												{user.email}
											</span>
										)}
									</button>
								))}
							</div>
						)}
					</div>

					{/* Selected invitees */}
					{selectedInvitees.length > 0 && (
						<div className="flex flex-wrap gap-1.5">
							{selectedInvitees.map((inv) => (
								<Badge
									key={inv.email}
									variant="secondary"
									className="gap-1 pr-1"
								>
									{inv.displayName ?? inv.email}
									<button
										type="button"
										onClick={() =>
											removeInvitee(inv.email)
										}
										className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5"
									>
										<X className="h-3 w-3" />
									</button>
								</Badge>
							))}
						</div>
					)}

					<Button
						onClick={handleSubmit}
						disabled={!canSubmit}
						className="w-full"
					>
						{submitting ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							"Schedule"
						)}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
