// Cloudflare zone cache purge for single URLs. Best-effort: purge failure
// never rolls back the D1/R2 mutation that triggered it — the cache TTL
// becomes the fallback (eventual consistency within the Cache-Control
// window). Missing token/zone silently skips (local dev, preview).
//
// Scope the API token to `Zone → Cache Purge → Purge` on the twig zone
// only. Store as a secret (`wrangler secret put CF_PURGE_TOKEN`); the zone
// ID is not secret and can be a plain var.

const PURGE_ENDPOINT = 'https://api.cloudflare.com/client/v4/zones';

export async function purgeUrls(env: Env, urls: readonly string[]): Promise<void> {
	if (urls.length === 0) return;
	const token = (env as unknown as { CF_PURGE_TOKEN?: string }).CF_PURGE_TOKEN;
	const zoneId = (env as unknown as { CF_ZONE_ID?: string }).CF_ZONE_ID;
	if (!token || !zoneId) return;

	try {
		const res = await fetch(`${PURGE_ENDPOINT}/${zoneId}/purge_cache`, {
			method: 'POST',
			headers: {
				authorization: `Bearer ${token}`,
				'content-type': 'application/json'
			},
			body: JSON.stringify({ files: urls })
		});
		if (!res.ok) {
			console.warn('[media/purge] CF API returned', res.status, await res.text());
		}
	} catch (err) {
		console.warn('[media/purge] fetch failed', err);
	}
}

export function mediaObjectUrl(mid: string): string {
	return `${__PUBLIC_URL__}/api/media/object/${mid}`;
}

export function mediaImageUrl(sha256: string, ext = 'webp'): string {
	return `${__PUBLIC_URL__}/api/media/image/${sha256}.${ext}`;
}
