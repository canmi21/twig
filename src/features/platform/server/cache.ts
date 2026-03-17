/* src/features/platform/server/cache.ts */

import { env } from 'cloudflare:workers'

function postHtmlKey(slug: string): string {
	return `content:post:html:${slug}`
}

export async function getPostHtml(slug: string): Promise<string | null> {
	return await env.taki_kv.get(postHtmlKey(slug))
}

export async function setPostHtml(slug: string, html: string): Promise<void> {
	await env.taki_kv.put(postHtmlKey(slug), html)
}

export async function deletePostHtml(slug: string): Promise<void> {
	await env.taki_kv.delete(postHtmlKey(slug))
}