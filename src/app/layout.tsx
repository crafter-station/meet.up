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
	description:
		"One app for the entire meeting. Video, transcription, and AI notes. No extra tools needed.",
	metadataBase: new URL("https://meetup.crafter.run"),
	icons: {
		icon: "/MeetUp-Brand-FavIcon.png",
	},
	openGraph: {
		title: "meet.up",
		description:
			"One app for the entire meeting. Video, transcription, and AI notes. No extra tools needed.",
		url: "https://meetup.crafter.run",
		siteName: "meet.up",
		images: [
			{
				url: "/MeetUp-Brand_og.png",
				width: 1200,
				height: 630,
				alt: "meet.up",
			},
		],
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "meet.up",
		description:
			"One app for the entire meeting. Video, transcription, and AI notes. No extra tools needed.",
		images: ["/MeetUp-Brand_og.png"],
	},
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
							colorBackground: "#0a0a0a",
							colorNeutral: "#fafafa",
							colorPrimary: "#ffba8f",
							colorPrimaryForeground: "#0a0a0a",
							colorForeground: "#fafafa",
							colorInputForeground: "#fafafa",
							colorInput: "#1a1a1a",
							borderRadius: "0.625rem",
							fontFamily:
								'"Adriane Text", ui-serif, Georgia, serif',
						},
						elements: {
							card: {
								backgroundColor: "#0a0a0a",
								border: "1px solid #2a2a2a",
							},
							userButtonPopoverCard: {
								backgroundColor: "#0a0a0a",
								border: "1px solid #2a2a2a",
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
								backgroundColor: "#0a0a0a",
								border: "1px solid #2a2a2a",
							},
							modalBackdrop: {
								backgroundColor: "rgba(0,0,0,0.6)",
							},
							navbar: {
								backgroundColor: "#0a0a0a",
							},
							navbarButton: {
								color: "#a3a3a3",
							},
							pageScrollBox: {
								backgroundColor: "#0a0a0a",
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
								borderColor: "#2a2a2a",
							},
							formFieldLabel: {
								color: "#a3a3a3",
							},
							formFieldInput: {
								backgroundColor: "#1a1a1a",
								borderColor: "#2a2a2a",
								color: "#fafafa",
							},
							footer: {
								backgroundColor: "#0a0a0a",
							},
							footerActionLink: {
								color: "#ffba8f",
							},
							badge: {
								backgroundColor: "#2a2a2a",
								color: "#fafafa",
							},
							socialButtonsBlockButton: {
								backgroundColor: "#1a1a1a",
								borderColor: "#2a2a2a",
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
