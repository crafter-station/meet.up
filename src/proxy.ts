import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
	],
};
