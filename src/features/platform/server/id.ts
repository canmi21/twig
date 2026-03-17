/* src/features/platform/server/id.ts */

import { v7 } from 'uuid'

/** Generate a UUID v7 as a 32-char lowercase hex string (no dashes). */
export function generateCid(): string {
	return v7().replaceAll('-', '')
}