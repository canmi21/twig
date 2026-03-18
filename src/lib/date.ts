/* src/lib/date.ts */

/**
 * Format an ISO date string for display.
 *
 * When `timeZone` is provided (from the client timezone cookie), the date
 * is rendered in the user's local timezone. Otherwise falls back to UTC
 * so that server and client produce identical output on first visit.
 */
export function formatDate(
	iso: string,
	options?: { month?: 'short' | 'long'; timeZone?: string },
): string {
	return new Date(iso).toLocaleDateString('en-US', {
		year: 'numeric',
		month: options?.month ?? 'short',
		day: 'numeric',
		timeZone: options?.timeZone ?? 'UTC',
	})
}
