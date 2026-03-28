import { Check } from "lucide-react";

export function IntegrationCard({ children }: { children: React.ReactNode }) {
	return (
		<div className="rounded-lg border border-border/50 bg-muted/10 p-5">
			{children}
		</div>
	);
}

export function IntegrationHeader({
	icon,
	title,
	description,
	action,
}: {
	icon: React.ReactNode;
	title: string;
	description: string;
	action: React.ReactNode;
}) {
	return (
		<div className="flex items-start justify-between gap-4">
			<div className="flex items-start gap-4">
				<div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/50 bg-muted/30">
					{icon}
				</div>
				<div className="space-y-1">
					<h3 className="text-sm font-medium">{title}</h3>
					<p className="text-xs text-muted-foreground">
						{description}
					</p>
				</div>
			</div>
			{action}
		</div>
	);
}

export function ConnectedBadge({
	label,
	detail,
}: {
	label: string;
	detail?: string | null;
}) {
	return (
		<div className="mt-4 flex items-center gap-3 rounded-md bg-muted/20 border border-border/30 px-3 py-2">
			<Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
			<div className="flex items-center gap-2 text-xs text-muted-foreground">
				<span>
					Connected as{" "}
					<span className="text-foreground font-medium">
						{label}
					</span>
				</span>
				{detail && (
					<span className="text-muted-foreground/50">
						&middot; {detail}
					</span>
				)}
			</div>
		</div>
	);
}
