/* src/lib/image.ts */

/**
 * Resolve an R2 object path to a full image URL.
 *
 * - Dev mode: proxied through `/api/file/{path}` via entry-server.
 * - Production with VITE_R2_PUBLIC_URL set: direct R2 custom domain access.
 * - Production without it: falls back to `/api/file/{path}` proxy.
 */
export function resolveImageUrl(path: string): string {
	if (import.meta.env.DEV) {
		return `/api/file/${path}`
	}
	const r2Url = import.meta.env.VITE_R2_PUBLIC_URL as string | undefined
	return r2Url ? `${r2Url}/${path}` : `/api/file/${path}`
}