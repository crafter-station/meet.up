import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<header className="sticky top-0 z-40 flex h-12 items-center gap-2 border-b border-border/40 bg-background/80 backdrop-blur-xl px-4">
					<SidebarTrigger className="-ml-1" />
				</header>
				{children}
			</SidebarInset>
		</SidebarProvider>
	);
}
