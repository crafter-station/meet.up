import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sileo";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const playfair = Playfair_Display({
	variable: "--font-playfair",
	subsets: ["latin"],
	weight: ["400", "500", "700"],
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
			className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased dark`}
		>
			<body className="min-h-dvh flex flex-col">
				<ClerkProvider
					appearance={{
						variables: {
							colorBackground: "#171717",
							colorNeutral: "white",
							colorPrimary: "#ffffff",
							colorPrimaryForeground: "#171717",
							colorForeground: "white",
							colorInputForeground: "white",
							colorInput: "#262626",
							borderRadius: "0.625rem",
							fontFamily:
								'"AOT Serial Mono", ui-monospace, monospace',
						},
						elements: {
							card: {
								backgroundColor: "#171717",
								border: "1px solid #2e2e2e",
							},
							userButtonPopoverCard: {
								backgroundColor: "#171717",
								border: "1px solid #2e2e2e",
							},
							userPreviewMainIdentifier: {
								color: "#fafafa",
							},
							userPreviewSecondaryIdentifier: {
								color: "#a3a3a3",
							},
							userButtonPopoverActionButton: {
								color: "#e5e5e5",
							},
							userButtonPopoverActionButtonIcon: {
								color: "#a3a3a3",
							},
							modalContent: {
								backgroundColor: "#171717",
								border: "1px solid #2e2e2e",
							},
							modalBackdrop: {
								backgroundColor: "rgba(0,0,0,0.6)",
							},
							navbar: {
								backgroundColor: "#171717",
							},
							navbarButton: {
								color: "#a3a3a3",
							},
							pageScrollBox: {
								backgroundColor: "#171717",
							},
							headerTitle: {
								color: "#fafafa",
							},
							headerSubtitle: {
								color: "#a3a3a3",
							},
							profileSectionTitleText: {
								color: "#e5e5e5",
							},
							profileSection: {
								borderColor: "#2e2e2e",
							},
							formFieldLabel: {
								color: "#a3a3a3",
							},
							formFieldInput: {
								backgroundColor: "#262626",
								borderColor: "#2e2e2e",
								color: "#fafafa",
							},
							footer: {
								backgroundColor: "#171717",
							},
							footerActionLink: {
								color: "#a3a3a3",
							},
							badge: {
								backgroundColor: "#2e2e2e",
								color: "#fafafa",
							},
							socialButtonsBlockButton: {
								backgroundColor: "#262626",
								borderColor: "#2e2e2e",
								color: "#e5e5e5",
							},
						},
					}}
				>
					<TooltipProvider>{children}</TooltipProvider>
					<Toaster position="top-center" />
				</ClerkProvider>
			</body>
		</html>
	);
}
