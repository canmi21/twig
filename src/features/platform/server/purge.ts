import { env } from 'cloudflare:workers'

/**
 * Purge specific URLs from Cloudflare CDN cache.
 * Requires CF_ZONE_ID and CF_API_TOKEN in Workers Secrets.
 */
export async function purgeUrls(urls: string[]): Promise<void> {
	if (urls.length === 0) {
		return
	}

	const zoneId = (env as Record<string, unknown>).CF_ZONE_ID as string | undefined
	const apiToken = (env as Record<string, unknown>).CF_API_TOKEN as string | undefined

	if (!zoneId || !apiToken) {
		throw new Error('CF_ZONE_ID and CF_API_TOKEN must be set as Workers Secrets')
	}

	const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
		body: JSON.stringify({ files: urls }),
		headers: {
			Authorization: `Bearer ${apiToken}`,
			'Content-Type': 'application/json',
		},
		method: 'POST',
	})

	if (!response.ok) {
		const body = await response.text()
		throw new Error(`Cloudflare purge failed (${response.status}): ${body}`)
	}
}
