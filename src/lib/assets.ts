/* src/lib/assets.ts */

/**
 * Resolve a well-known static asset filename to a full URL.
 *
 * Unlike `resolveImageUrl` (content-addressed with hash paths), these assets
 * live at fixed R2 keys (favicon.svg, robots.txt, etc.) and are served from
 * the site root via redirects in entry-server.
 *
 * - Dev: proxied through `/api/file/{filename}` via entry-server.
 * - Prod with VITE_R2_PUBLIC_URL: direct R2 custom domain.
 * - Prod without it: falls back to `/api/file/{filename}` proxy.
 */
export function resolveAssetUrl(filename: string): string {
	if (import.meta.env.DEV) {
		return `/api/file/${filename}`
	}
	const r2Url = import.meta.env.VITE_R2_PUBLIC_URL as string | undefined
	return r2Url ? `${r2Url}/${filename}` : `/api/file/${filename}`
}
