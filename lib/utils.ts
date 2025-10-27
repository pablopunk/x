import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Performs a shallow equality check between two objects or arrays.
 * For deep structures, uses JSON.stringify as a fallback (with try-catch for safety).
 * This is more efficient than always stringifying.
 */
export function isEqual<T>(a: T, b: T): boolean {
	if (a === b) return true;
	if (a == null || b == null) return false;
	if (typeof a !== "object" || typeof b !== "object") return false;

	// Arrays
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false;
		// For small arrays, do shallow comparison
		if (a.length < 100) {
			for (let i = 0; i < a.length; i++) {
				if (a[i] !== b[i]) {
					// Fall back to JSON comparison for nested objects
					try {
						if (JSON.stringify(a) !== JSON.stringify(b)) return false;
						return true;
					} catch {
						return false;
					}
				}
			}
			return true;
		}
	}

	// Objects
	const keysA = Object.keys(a as object);
	const keysB = Object.keys(b as object);
	if (keysA.length !== keysB.length) return false;

	// For objects with few keys, do shallow comparison
	if (keysA.length < 20) {
		for (const key of keysA) {
			if (
				!Object.prototype.hasOwnProperty.call(b, key) ||
				(a as Record<string, unknown>)[key] !==
					(b as Record<string, unknown>)[key]
			) {
				// Fall back to JSON comparison
				try {
					return JSON.stringify(a) === JSON.stringify(b);
				} catch {
					return false;
				}
			}
		}
		return true;
	}

	// For large objects, use JSON.stringify as last resort
	try {
		return JSON.stringify(a) === JSON.stringify(b);
	} catch {
		return false;
	}
}
