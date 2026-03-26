import { createHash } from "node:crypto";

export function hashSecret(secret: string): string {
	return createHash("sha256").update(secret).digest("hex");
}

export function verifyOwner(plainSecret: string, storedHash: string): boolean {
	return hashSecret(plainSecret) === storedHash;
}
