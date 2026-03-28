"use client";

import { useAuth } from "@clerk/nextjs";
import { useFingerprint } from "./use-fingerprint";

/**
 * Unified identity hook.
 * Returns Clerk user ID when signed in, fingerprint ID when anonymous.
 */
export function useCurrentUser() {
	const { userId: clerkId, isSignedIn, isLoaded: clerkLoaded } = useAuth();
	const { visitorId: fingerprintId, isLoading: fingerprintLoading } =
		useFingerprint();

	const clerkDetermined = clerkLoaded && isSignedIn !== undefined;
	const isLoading = !clerkDetermined || (!isSignedIn && fingerprintLoading);

	const userId = isLoading ? null : isSignedIn ? clerkId : fingerprintId;

	return {
		/** Current active user ID (Clerk ID if authenticated, fingerprint if anonymous) */
		userId,
		/** Clerk user ID (null if not signed in) */
		clerkId,
		/** Fingerprint ID (always available after loading) */
		fingerprintId,
		/** Whether the user is authenticated via Clerk */
		isAuthenticated: isSignedIn ?? false,
		/** Whether the identity is still being determined */
		isLoading,
	};
}
