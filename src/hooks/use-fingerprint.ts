"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "meetup_user_id";

function safeLocalStorageGet(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function safeLocalStorageSet(key: string, value: string): void {
	try {
		localStorage.setItem(key, value);
	} catch {
		// localStorage unavailable (private browsing)
	}
}

export function useFingerprint() {
	const [visitorId, setVisitorId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const mountedRef = useRef(true);

	useEffect(() => {
		const stored = safeLocalStorageGet(STORAGE_KEY);
		if (stored) {
			setVisitorId(stored);
			setIsLoading(false);
			return () => {
				mountedRef.current = false;
			};
		}

		const load = async () => {
			try {
				const FingerprintJS = (await import("@fingerprintjs/fingerprintjs"))
					.default;
				const fp = await FingerprintJS.load();
				const result = await fp.get();
				const id = result.visitorId;
				safeLocalStorageSet(STORAGE_KEY, id);
				if (mountedRef.current) {
					setVisitorId(id);
				}
			} catch {
				const fallback = crypto.randomUUID();
				safeLocalStorageSet(STORAGE_KEY, fallback);
				if (mountedRef.current) {
					setVisitorId(fallback);
				}
			} finally {
				if (mountedRef.current) {
					setIsLoading(false);
				}
			}
		};

		load();

		return () => {
			mountedRef.current = false;
		};
	}, []);

	return { visitorId, isLoading };
}
