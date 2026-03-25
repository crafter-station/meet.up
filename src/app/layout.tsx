import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "meet.up",
	description: "Video calls with superpowers",
};

export default function RootLayout({
	children,
}: { children: React.ReactNode }) {
	return (
		<html
			lang="en"
			className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
		>
			<body className="min-h-full flex flex-col">
				<TooltipProvider>{children}</TooltipProvider>
				<Toaster />
			</body>
		</html>
	);
}
