"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import {
	ArrowRight,
	Captions,
	Check,
	ChevronDown,
	ChevronRight,
	LogIn,
	MessageSquare,
	Mic,
	PenLine,
	Plus,
	Sparkles,
	Video,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

/* ─── Shared animation presets ─── */
const fadeUp = {
	initial: { opacity: 0, y: 20 },
	whileInView: { opacity: 1, y: 0 },
	viewport: { once: true } as const,
};

const sectionHeadingStyle = {
	letterSpacing: "-0.0325em",
	fontWeight: 600,
	lineHeight: 1.1,
};

/* ─── Navbar ─── */
function Navbar({
	isSignedIn,
	onJoin,
}: {
	isSignedIn: boolean;
	onJoin: () => void;
}) {
	return (
		<header className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
			<div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
				<div className="flex items-center gap-6">
					<Link
						href="/"
						className="flex items-center gap-2 text-foreground"
					>
						<Video className="h-4 w-4" />
						<span
							className="font-semibold text-sm"
							style={{ letterSpacing: "-0.02em" }}
						>
							meet.up
						</span>
					</Link>
					<nav className="hidden md:flex items-center gap-1 text-sm">
						{["Features", "Pricing", "Docs"].map((item) => (
							<span
								key={item}
								className="px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-default"
							>
								{item}
							</span>
						))}
					</nav>
				</div>
				<div className="flex items-center gap-2">
					{isSignedIn ? (
						<UserButton />
					) : (
						<>
							<Link href="/sign-in">
								<Button variant="ghost" size="sm">
									Log in
								</Button>
							</Link>
							<Button
								size="sm"
								className="rounded-lg"
								onClick={onJoin}
							>
								Get started
							</Button>
						</>
					)}
				</div>
			</div>
		</header>
	);
}

/* ─── 3D Dashboard Mockup (Sprint-style, zinc colors) ─── */

const panelVariants = {
	hidden: { opacity: 0, x: 100, y: -80 },
	visible: {
		opacity: 1,
		x: 0,
		y: 0,
		transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] as const },
	},
};

function DashboardMockup() {
	const [checked, setChecked] = useState<number[]>([]);

	useEffect(() => {
		const t1 = setTimeout(() => setChecked([0]), 3500);
		const t2 = setTimeout(() => setChecked([0, 1]), 5000);
		return () => { clearTimeout(t1); clearTimeout(t2); };
	}, []);

	return (
		<motion.div
			className="w-full h-full flex overflow-hidden"
			style={{ backgroundColor: "#09090B" }}
			variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.3, delayChildren: 0.5 } } }}
			initial="hidden"
			animate="visible"
		>
			{/* ── Sidebar ── */}
			<motion.div
				className="w-[220px] h-full border-r border-zinc-800/50 flex flex-col shrink-0"
				style={{ backgroundColor: "rgba(24,24,27,0.8)" }}
				variants={panelVariants}
			>
				<div className="p-3 border-b border-zinc-800/50">
					<div className="flex items-center gap-2 px-2 py-1.5">
						<Video className="w-4 h-4 text-white" />
						<span className="text-white font-semibold text-sm">meet.up</span>
						<ChevronDown className="w-3.5 h-3.5 text-zinc-500 ml-auto" />
					</div>
				</div>

				<div className="px-3 mt-3 space-y-0.5">
					{[
						{ icon: Video, label: "Meetings", active: true },
						{ icon: Captions, label: "Transcripts" },
						{ icon: Sparkles, label: "Summaries" },
					].map((item) => (
						<div
							key={item.label}
							className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs ${
								item.active
									? "bg-zinc-800 text-white"
									: "text-zinc-400 hover:bg-zinc-800/50"
							}`}
						>
							<item.icon className="w-4 h-4" />
							<span className="flex-1">{item.label}</span>
							{item.active && (
								<span className="bg-indigo-500/80 text-white text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full font-medium px-1">
									1
								</span>
							)}
						</div>
					))}
				</div>

				<div className="mt-5 px-3">
					<div className="px-2 py-1 text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
						Recent
					</div>
					<div className="space-y-0.5 mt-1">
						{[
							{ label: "Q2 Roadmap Planning", time: "Live", live: true },
							{ label: "Design Review", time: "2h ago" },
							{ label: "Sprint Retro", time: "1d ago" },
							{ label: "Onboarding Sync", time: "3d ago" },
						].map((m) => (
							<div
								key={m.label}
								className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs ${
									m.live
										? "bg-zinc-800/60 text-white"
										: "text-zinc-400 hover:bg-zinc-800/30"
								}`}
							>
								{m.live && (
									<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
								)}
								<span className="flex-1 truncate">{m.label}</span>
								<span className={`text-[10px] shrink-0 ${m.live ? "text-emerald-400" : "text-zinc-600"}`}>
									{m.time}
								</span>
							</div>
						))}
					</div>
				</div>
			</motion.div>

			{/* ── Video Grid Panel ── */}
			<motion.div
				className="w-[400px] h-full border-r border-zinc-800/50 flex flex-col shrink-0"
				style={{ backgroundColor: "rgba(24,24,27,0.4)" }}
				variants={panelVariants}
			>
				<div className="px-4 py-3 border-b border-zinc-800/50 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
						<span className="text-white font-semibold text-sm">Q2 Roadmap Planning</span>
					</div>
					<span className="text-zinc-500 text-[10px]">32:14</span>
				</div>

				<div className="flex-1 p-3">
					<div className="grid grid-cols-2 gap-2 h-full">
						{[
							{ name: "Sarah K.", speaking: true },
							{ name: "Alex R.", speaking: false },
							{ name: "You", speaking: false },
							{ name: "Mike L.", speaking: false },
						].map((p) => (
							<div
								key={p.name}
								className={`rounded-lg flex flex-col items-center justify-center relative transition-all duration-300 ${
									p.speaking
										? "bg-zinc-800/80 ring-2 ring-indigo-500/50"
										: "bg-zinc-800/40"
								}`}
							>
								<div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-[11px] font-medium text-zinc-300">
									{p.name.split(" ").map((n) => n[0]).join("")}
								</div>
								<span className="text-[10px] text-zinc-400 mt-1.5">{p.name}</span>
								{p.speaking && (
									<div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5">
										{[1, 2, 3, 4, 3].map((h, i) => (
											<div
												key={i}
												className="w-0.5 bg-indigo-400 rounded-full animate-pulse"
												style={{
													height: `${h * 3}px`,
													animationDelay: `${i * 0.15}s`,
												}}
											/>
										))}
									</div>
								)}
							</div>
						))}
					</div>
				</div>

				{/* Transcription bar */}
				<div className="px-3 pb-3">
					<div className="rounded-lg bg-zinc-800/60 border border-zinc-700/40 px-3 py-2">
						<div className="flex items-center gap-1.5 mb-1">
							<Captions className="w-3 h-3 text-indigo-400" />
							<span className="text-[10px] text-indigo-400 font-medium">Live Transcription</span>
						</div>
						<p className="text-[11px] text-zinc-400">
							<span className="text-zinc-200 font-medium">Sarah:</span>{" "}
							I think we should prioritize the API integration before the mobile beta...
						</p>
					</div>
				</div>

				{/* Controls */}
				<div className="px-3 pb-3 flex items-center justify-center gap-2">
					{[Mic, Video, MessageSquare, Captions].map((Icon, i) => (
						<div
							key={i}
							className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700/50 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
						>
							<Icon className="h-3.5 w-3.5" />
						</div>
					))}
					<div className="h-8 w-8 rounded-full bg-red-500/80 flex items-center justify-center text-white">
						<span className="text-[9px] font-semibold">End</span>
					</div>
				</div>
			</motion.div>

			{/* ── AI Feed Panel ── */}
			<motion.div
				className="flex-1 h-full flex flex-col overflow-hidden"
				style={{ backgroundColor: "#09090B" }}
				variants={panelVariants}
			>
				<div className="px-5 py-3 border-b border-zinc-800/50 flex items-center justify-between shrink-0">
					<div className="flex items-center gap-2">
						<Sparkles className="w-4 h-4 text-zinc-400" />
						<span className="text-white font-semibold text-sm">Meeting Feed</span>
					</div>
				</div>

				<div className="flex-1 p-4 space-y-3 overflow-hidden">
					{/* Chat messages */}
					<div>
						<div className="flex items-center gap-2 mb-1">
							<div className="w-5 h-5 rounded-full bg-zinc-700" />
							<span className="text-white text-xs">Sarah</span>
							<span className="text-zinc-600 text-[10px]">2m ago</span>
						</div>
						<div className="ml-7 rounded-lg bg-zinc-800/40 px-3 py-2">
							<p className="text-zinc-300 text-xs">Let&apos;s discuss the Q2 roadmap priorities</p>
						</div>
					</div>

					<div className="flex justify-end">
						<div className="rounded-lg bg-indigo-500/15 px-3 py-2 max-w-[80%]">
							<p className="text-zinc-300 text-xs">I&apos;ve prepped the metrics deck 👍</p>
						</div>
					</div>

					{/* Note */}
					<div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 px-3 py-2">
						<div className="flex items-center gap-1.5 mb-1">
							<PenLine className="h-3 w-3 text-zinc-600" />
							<span className="text-[10px] text-zinc-500">note · Alex · 1m ago</span>
						</div>
						<p className="text-zinc-400 text-xs">Key decision: API integration is the top priority for Q2</p>
					</div>

					{/* AI Artifact */}
					<div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 overflow-hidden">
						<div className="flex items-center gap-1.5 px-3 py-2 border-b border-zinc-800/30">
							<Sparkles className="h-3.5 w-3.5 text-amber-400" />
							<span className="text-xs font-medium text-zinc-200">AI Summary</span>
							<span className="text-[10px] text-zinc-600 ml-auto">just now</span>
						</div>
						<div className="px-3 py-2.5 space-y-2">
							<p className="text-zinc-400 text-xs leading-relaxed">
								Team aligned on three Q2 priorities: API integration, mobile beta launch, and onboarding conversion improvements.
							</p>
							<div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mt-2">
								Action Items
							</div>
							{[
								"Alex to finalize API spec by Friday",
								"Sarah to schedule user testing sessions",
								"Mike to draft the launch announcement",
							].map((item, i) => (
								<div key={item} className="flex items-center gap-2">
									<div
										className={`h-3.5 w-3.5 rounded-full border shrink-0 flex items-center justify-center transition-all duration-500 ${
											checked.includes(i) ? "border-emerald-500 bg-emerald-500/20" : "border-zinc-700"
										}`}
									>
										{checked.includes(i) && (
											<Check className="h-2 w-2 text-emerald-500" />
										)}
									</div>
									<span
										className={`text-xs transition-all duration-500 ${
											checked.includes(i) ? "line-through text-zinc-600" : "text-zinc-300"
										}`}
									>
										{item}
									</span>
								</div>
							))}
						</div>
					</div>
				</div>
			</motion.div>
		</motion.div>
	);
}

/* ─── Feature Cards ─── */
const features = [
	{
		title: "Live transcription in every call",
		icon: Captions,
		description:
			"Every word, every speaker — captured in real time. Pin moments to your feed.",
	},
	{
		title: "AI that takes notes for you",
		icon: Sparkles,
		description:
			"Summaries, decisions, and action items generated automatically when your call ends.",
	},
	{
		title: "Zero friction, just a link",
		icon: Zap,
		description:
			"No downloads, no plugins. Share a link and start in seconds from any browser.",
	},
];

/* ─── FAQ ─── */
function FaqItem({ question, answer }: { question: string; answer: string }) {
	const [open, setOpen] = useState(false);
	return (
		<div className="border-b border-border/50">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex w-full items-center justify-between py-5 text-left text-sm font-medium hover:text-foreground/80 transition-colors"
			>
				{question}
				<ChevronDown
					className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
				/>
			</button>
			{open && (
				<div className="pb-5 text-sm text-muted-foreground leading-relaxed">
					{answer}
				</div>
			)}
		</div>
	);
}

/* ─── Page ─── */
export default function Home() {
	const router = useRouter();
	const { isSignedIn } = useUser();
	const [roomCode, setRoomCode] = useState("");
	const [creating, setCreating] = useState(false);
	const [joinOpen, setJoinOpen] = useState(false);
	const [yOffset, setYOffset] = useState(0);

	useEffect(() => {
		const onScroll = () => {
			setYOffset(Math.min(window.scrollY / 400, 1) * -30);
		};
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	const createRoom = async () => {
		setCreating(true);
		try {
			const res = await fetch("/api/r", { method: "POST" });
			const { id, ownerSecret } = await res.json();
			sessionStorage.setItem(`ownerSecret:${id}`, ownerSecret);
			router.push(`/${id}`);
		} finally {
			setCreating(false);
		}
	};

	const joinRoom = (e: React.FormEvent) => {
		e.preventDefault();
		if (roomCode.trim()) router.push(`/${roomCode.trim()}`);
	};

	return (
		<div className="flex flex-col">
			<Navbar isSignedIn={!!isSignedIn} onJoin={() => setJoinOpen(true)} />

			{/* ─── Hero ─── */}
			<section className="relative min-h-screen overflow-hidden pt-14">
				{/* Subtle glow */}
				<div
					className="absolute pointer-events-none"
					style={{
						top: "40%",
						left: "50%",
						transform: "translate(-50%, -30%)",
						width: "1200px",
						height: "800px",
						background:
							"radial-gradient(ellipse at center, rgba(99, 102, 241, 0.08) 0%, transparent 70%)",
					}}
				/>

				<div className="relative z-10 pt-16 flex flex-col">
					<div className="w-full flex justify-center px-6 mt-16">
						<div className="w-full max-w-4xl">
							<motion.h1
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.6 }}
								className="font-serif text-4xl md:text-5xl lg:text-[56px] text-foreground text-balance"
								style={sectionHeadingStyle}
							>
								Video calls, purpose-built for teams that
								ship
							</motion.h1>
							<motion.p
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.6, delay: 0.1 }}
								className="mt-6 text-lg text-muted-foreground"
							>
								Live transcription. AI-powered notes.
								<br />
								Smart summaries after every meeting.
							</motion.p>
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.6, delay: 0.2 }}
								className="relative z-20 mt-8 flex items-center gap-4"
							>
								<Button
									onClick={createRoom}
									disabled={creating}
									className="h-11 px-5 text-sm font-medium rounded-lg"
								>
									{creating
										? "Creating..."
										: "Start meeting"}
								</Button>
								<button
									type="button"
									onClick={() => setJoinOpen(true)}
									className="text-muted-foreground font-medium hover:text-foreground transition-colors flex items-center gap-2 text-sm"
								>
									Join with a code
									<ArrowRight className="h-4 w-4" />
								</button>
							</motion.div>
						</div>
					</div>

					{/* 3D Stage — full bleed */}
					<div
						className="relative mt-16 hidden md:block pointer-events-none"
						style={{
							width: "100vw",
							marginLeft: "-50vw",
							marginRight: "-50vw",
							position: "relative",
							left: "50%",
							right: "50%",
							height: "700px",
							marginTop: "-60px",
						}}
					>
						{/* Bottom gradient fade */}
						<div
							className="absolute bottom-0 left-0 right-0 h-72 z-10 pointer-events-none"
							style={{
								background: "linear-gradient(to top, var(--background) 20%, transparent 100%)",
							}}
						/>

						{/* Perspective container */}
						<div
							style={{
								transform: `translateY(${yOffset}px)`,
								transition: "transform 0.1s ease-out",
								contain: "strict",
								perspective: "4000px",
								perspectiveOrigin: "100% 0",
								width: "100%",
								height: "100%",
								transformStyle: "preserve-3d",
								position: "relative",
							}}
						>
							{/* Transformed base */}
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{
									delay: 0.5,
									duration: 1,
									ease: [0.22, 1, 0.36, 1],
								}}
								style={{
									backgroundColor: "#09090B",
									transformOrigin: "0 0",
									backfaceVisibility: "hidden",
									WebkitBackfaceVisibility: "hidden",
									border: "1px solid #1e1e1e",
									borderRadius: "10px",
									width: "1600px",
									height: "900px",
									margin: "280px auto auto",
									position: "absolute",
									top: 0,
									bottom: 0,
									left: 0,
									right: 0,
									transform:
										"translate(2%) scale(1.2) rotateX(47deg) rotateY(31deg) rotate(324deg)",
									transformStyle: "preserve-3d",
									overflow: "hidden",
								}}
							>
								{/* Glass overlay */}
								<div
									className="absolute inset-0 z-10 pointer-events-none"
									style={{
										border: "1px solid rgba(66, 66, 66, 0.5)",
										background:
											"linear-gradient(rgba(255, 255, 255, 0.1) 40%, rgba(8, 9, 10, 0.1) 100%)",
										borderRadius: "10px",
										boxShadow:
											"inset 0 1.503px 5.261px rgba(255, 255, 255, 0.04), inset 0 -0.752px 0.752px rgba(255, 255, 255, 0.1)",
									}}
								/>

								{/* Side gradient fade */}
								<div
									className="absolute pointer-events-none z-[11]"
									style={{
										background: "linear-gradient(180deg, transparent 0%, #09090B 100%)",
										height: "80%",
										bottom: "-2px",
										left: "-180px",
										right: "-180px",
									}}
								/>

								<DashboardMockup />
							</motion.div>
						</div>
					</div>

					{/* Mobile fallback */}
					<div className="md:hidden px-6 mt-8">
						<div className="rounded-xl border border-zinc-800/50 overflow-hidden" style={{ backgroundColor: "#09090B" }}>
							<DashboardMockup />
						</div>
					</div>
				</div>
			</section>

			{/* ─── Feature Cards ─── */}
			<section className="relative z-20 py-32">
				<div className="w-full flex justify-center px-6">
					<div className="w-full max-w-5xl">
						<div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 mb-16">
							<motion.h2
								{...fadeUp}
								transition={{ duration: 0.6 }}
								className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-[56px] max-w-md"
								style={sectionHeadingStyle}
							>
								Built for teams that move fast
							</motion.h2>
							<motion.div
								{...fadeUp}
								transition={{ duration: 0.6, delay: 0.1 }}
								className="max-w-md"
							>
								<p className="text-muted-foreground leading-relaxed">
									meet.up replaces your generic video
									calls with an intelligent workspace
									that captures, organizes, and acts on
									every conversation.{" "}
									<button
										type="button"
										onClick={createRoom}
										className="text-foreground inline-flex items-center gap-1 hover:underline"
									>
										Get started{" "}
										<ChevronRight className="w-4 h-4" />
									</button>
								</p>
							</motion.div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							{features.map((card, index) => (
								<motion.div
									key={card.title}
									{...fadeUp}
									transition={{
										duration: 0.6,
										delay: 0.2 + index * 0.1,
									}}
									className="bg-card/30 border border-border/40 hover:border-border/60 transition-colors cursor-default group overflow-hidden relative flex flex-col justify-end"
									style={{
										borderRadius: "30px",
										height: "360px",
										isolation: "isolate",
									}}
								>
									{/* Illustration area */}
									<div
										className="absolute top-0 left-0 w-full h-[65%] flex items-center justify-center p-8"
										style={{
											maskImage:
												"linear-gradient(#000 60%, transparent 95%)",
											WebkitMaskImage:
												"linear-gradient(#000 60%, transparent 95%)",
										}}
									>
										<card.icon className="h-16 w-16 text-muted-foreground/20" />
									</div>

									<div
										className="relative z-10 flex items-center justify-between w-full"
										style={{
											padding: "0 24px 32px",
											gap: "12px",
										}}
									>
										<div>
											<h3 className="text-foreground font-medium text-lg leading-tight mb-2">
												{card.title}
											</h3>
											<p className="text-muted-foreground text-sm">
												{card.description}
											</p>
										</div>
										<div className="w-8 h-8 rounded-full border border-border/50 flex items-center justify-center text-muted-foreground group-hover:border-border group-hover:text-foreground transition-colors flex-shrink-0">
											<Plus className="w-4 h-4" />
										</div>
									</div>
								</motion.div>
							))}
						</div>
					</div>
				</div>
			</section>

			{/* ─── AI Section ─── */}
			<section className="relative z-20 py-32">
				<div className="w-full flex justify-center px-6">
					<div className="w-full max-w-5xl">
						{/* Section label */}
						<motion.div
							{...fadeUp}
							transition={{ duration: 0.6 }}
							className="flex items-center gap-2 mb-6"
						>
							<div className="w-2 h-2 rounded-full bg-primary" />
							<span className="text-muted-foreground text-sm">
								Artificial intelligence
							</span>
							<ChevronRight className="w-4 h-4 text-muted-foreground/50" />
						</motion.div>

						<motion.h2
							{...fadeUp}
							transition={{ duration: 0.6, delay: 0.1 }}
							className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-[56px] max-w-3xl mb-8"
							style={sectionHeadingStyle}
						>
							AI that works during and after every call
						</motion.h2>

						<motion.p
							{...fadeUp}
							transition={{ duration: 0.6, delay: 0.2 }}
							className="text-muted-foreground max-w-md mb-16"
						>
							<span className="text-foreground font-medium">
								Real-time intelligence.
							</span>{" "}
							From live transcription to post-meeting summaries,
							meet.up&apos;s AI captures what matters so your
							team can focus on the conversation.
						</motion.p>

						{/* Two-column deep dive */}
						<motion.div
							{...fadeUp}
							transition={{ duration: 0.6, delay: 0.3 }}
						>
							<div className="grid grid-cols-1 md:grid-cols-2">
								{/* Left: During the call */}
								<div className="border-t border-r border-b border-border/40 pt-12 pr-8 md:pr-12 pb-16">
									<h3 className="text-foreground font-medium text-xl mb-3">
										During the call
									</h3>
									<p className="text-muted-foreground text-sm mb-8">
										Live transcription with speaker
										attribution, real-time notes, and a
										unified feed for chat, action items,
										and AI artifacts.
									</p>

									<div className="bg-card/30 border border-border/40 rounded-xl p-5 space-y-3">
										<div className="flex items-center gap-2 mb-4">
											<Captions className="h-4 w-4 text-primary" />
											<span className="text-sm text-muted-foreground">
												Live{" "}
												<span className="text-foreground">
													Transcription
												</span>
											</span>
										</div>

										{[
											{
												speaker: "Sarah",
												text: "I think we should prioritize the API integration",
											},
											{
												speaker: "Alex",
												text: "Agreed. I can have a draft spec by Thursday",
											},
											{
												speaker: "Mike",
												text: "Let me sync with the design team first",
											},
										].map((line) => (
											<div
												key={line.speaker}
												className="flex items-start gap-2"
											>
												<span className="text-[11px] text-muted-foreground/50 w-10 shrink-0 pt-0.5">
													{line.speaker}
												</span>
												<p className="text-sm text-foreground/70">
													{line.text}
												</p>
											</div>
										))}

										<div className="flex items-center gap-1.5 pt-2">
											<div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
											<span className="text-xs text-muted-foreground/50 italic">
												Recording...
											</span>
										</div>
									</div>
								</div>

								{/* Right: After the call */}
								<div className="border-t border-b border-border/40 pt-12 pl-8 md:pl-12 pb-16">
									<h3 className="text-foreground font-medium text-xl mb-3">
										After the call
									</h3>
									<p className="text-muted-foreground text-sm mb-8">
										AI-generated summaries with key
										decisions, action items, and a
										searchable transcript — ready to
										share.
									</p>

									<div className="bg-card/30 border border-border/40 rounded-xl p-5">
										<div className="flex items-center gap-2 mb-4">
											<Sparkles className="h-4 w-4 text-amber" />
											<span className="text-sm text-muted-foreground">
												AI{" "}
												<span className="text-foreground">
													Summary
												</span>
											</span>
										</div>

										<p className="text-sm text-foreground/70 mb-4">
											Team aligned on 3 priorities:
											API integration, mobile beta
											launch, and onboarding
											improvements.
										</p>

										<div className="space-y-2">
											{[
												{
													text: "Alex: API spec by Thursday",
													done: true,
												},
												{
													text: "Sarah: User testing sessions",
													done: true,
												},
												{
													text: "Mike: Launch announcement",
													done: false,
												},
											].map((item) => (
												<div
													key={item.text}
													className="flex items-center gap-2"
												>
													<div
														className={`h-4 w-4 rounded-full border shrink-0 flex items-center justify-center ${item.done ? "border-green-500 bg-green-500/20" : "border-border/50"}`}
													>
														{item.done && (
															<Check className="h-2.5 w-2.5 text-green-500" />
														)}
													</div>
													<span
														className={`text-sm ${item.done ? "line-through text-muted-foreground/40" : "text-foreground/70"}`}
													>
														{item.text}
													</span>
												</div>
											))}
										</div>
									</div>
								</div>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* ─── FAQ ─── */}
			<section className="relative z-20 py-32 border-t border-border/30">
				<div className="max-w-5xl mx-auto w-full px-6">
					<div className="grid md:grid-cols-[1fr_2fr] gap-12">
						<motion.h3
							{...fadeUp}
							transition={{ duration: 0.6 }}
							className="text-[20px] font-semibold"
							style={{ letterSpacing: "-0.02em" }}
						>
							Frequently
							<br />
							Asked Questions
						</motion.h3>
						<div>
							<FaqItem
								question="Is meet.up free to use?"
								answer="Yes. Creating and joining meetings is completely free. AI-powered features like transcription and summaries are included at no extra cost during the beta."
							/>
							<FaqItem
								question="Do I need to install anything?"
								answer="No. meet.up runs entirely in the browser. Just share a link and your participants can join instantly — no downloads, plugins, or extensions required."
							/>
							<FaqItem
								question="How does live transcription work?"
								answer="meet.up uses AI-powered speech recognition to transcribe audio in real time. Each speaker is identified and attributed automatically. You can pin important moments to your meeting feed."
							/>
							<FaqItem
								question="What happens after the meeting ends?"
								answer="An AI-generated summary is created automatically with key decisions, action items, and a full transcript. You can access it anytime from your meeting history."
							/>
						</div>
					</div>
				</div>
			</section>

			{/* ─── CTA ─── */}
			<section className="py-24 px-6 border-t border-border/30">
				<div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
					<motion.h2
						{...fadeUp}
						transition={{ duration: 0.6 }}
						className="font-serif text-3xl md:text-4xl lg:text-[42px] font-semibold tracking-tight"
					>
						Start the conversation.
					</motion.h2>
					<div className="flex items-center gap-3">
						<Button
							variant="outline"
							className="h-11 px-5 rounded-lg text-sm font-medium border-border/50"
							onClick={() => setJoinOpen(true)}
						>
							Join a meeting
						</Button>
						<Button
							className="h-11 px-5 rounded-lg text-sm font-medium"
							onClick={createRoom}
							disabled={creating}
						>
							{creating ? "Creating..." : "Get started"}
						</Button>
					</div>
				</div>
			</section>

			{/* ─── Footer ─── */}
			<footer className="border-t border-border/30 py-12 px-6">
				<div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
					<div className="flex items-center gap-2 text-muted-foreground">
						<Video className="h-4 w-4" />
						<span className="text-sm font-medium">meet.up</span>
					</div>
					<p className="text-xs text-muted-foreground/50">
						Video calls with superpowers.
					</p>
				</div>
			</footer>

			{/* ─── Join Dialog ─── */}
			<Dialog open={joinOpen} onOpenChange={setJoinOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Join a meeting</DialogTitle>
						<DialogDescription>
							Enter the room code shared by the host.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={joinRoom} className="flex gap-2">
						<Input
							value={roomCode}
							onChange={(e) => setRoomCode(e.target.value)}
							placeholder="Room code"
							className="flex-1 h-10"
							autoFocus
						/>
						<Button
							type="submit"
							size="icon"
							className="h-10 w-10"
							disabled={!roomCode.trim()}
						>
							<ArrowRight className="h-4 w-4" />
						</Button>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
