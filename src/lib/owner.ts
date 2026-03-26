import { createHash } from "node:crypto";

export function hashSecret(secret: string): string {
	return createHash("sha256").update(secret).digest("hex");
}

/**
 * Check if the request comes from the room owner via either:
 * 1. ownerSecret header (hashed and compared to DB hash)
 * 2. Clerk userId match against ownerClerkUserId
 */
export function checkIsOwner(
	ownerSecret: string | null,
	clerkUserId: string | null,
	room: { ownerSecretHash: string; ownerClerkUserId: string | null },
): boolean {
	return !!(
		(ownerSecret && hashSecret(ownerSecret) === room.ownerSecretHash) ||
		(clerkUserId &&
			room.ownerClerkUserId &&
			clerkUserId === room.ownerClerkUserId)
	);
}
