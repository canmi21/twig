/* src/server/assets.ts */

import { createServerFn } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { requireAuth } from '~/server/auth.server'

const ALLOWED_KEYS = new Set([
	'favicon.svg',
	'favicon-96x96.png',
	'favicon.ico',
	'apple-touch-icon.png',
	'robots.txt',
])

const MIME_MAP: Record<string, string> = {
	svg: 'image/svg+xml',
	png: 'image/png',
	ico: 'image/x-icon',
	txt: 'text/plain',
}

function validateKey(key: string): string {
	if (!ALLOWED_KEYS.has(key)) {
		throw new Error(`Invalid asset key: ${key}`)
	}
	return key
}

export const uploadAsset = createServerFn({ method: 'POST' })
	.inputValidator((d: { key: string; base64: string; type: string }) => {
		validateKey(d.key)
		if (!d.base64) {
			throw new Error('File data is required')
		}
		return d
	})
	.handler(async ({ data }) => {
		await requireAuth()
		const binaryString = atob(data.base64)
		const bytes = new Uint8Array(binaryString.length)
		for (let idx = 0; idx < binaryString.length; idx++) {
			bytes[idx] = binaryString.charCodeAt(idx)
		}
		const ext = data.key.split('.').pop()?.toLowerCase() ?? ''
		const contentType = MIME_MAP[ext] ?? data.type
		await env.taki_bucket.put(data.key, bytes.buffer, {
			httpMetadata: { contentType },
		})
	})

export const deleteAsset = createServerFn({ method: 'POST' })
	.inputValidator((d: { key: string }) => {
		validateKey(d.key)
		return d
	})
	.handler(async ({ data }) => {
		await requireAuth()
		await env.taki_bucket.delete(data.key)
	})

export const getAssetExists = createServerFn({ method: 'GET' })
	.inputValidator((d: { key: string }) => {
		validateKey(d.key)
		return d
	})
	.handler(async ({ data }) => {
		const obj = await env.taki_bucket.head(data.key)
		return { exists: obj !== null }
	})

export const getRobotsTxt = createServerFn({ method: 'GET' }).handler(async () => {
	const obj = await env.taki_bucket.get('robots.txt')
	if (!obj) {
		return ''
	}
	return obj.text()
})
