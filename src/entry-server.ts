/* src/entry-server.ts */

import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'
import { env } from 'cloudflare:workers'

const MIME_MAP: Record<string, string> = {
	gif: 'image/gif',
	ico: 'image/x-icon',
	jpeg: 'image/jpeg',
	jpg: 'image/jpeg',
	png: 'image/png',
	svg: 'image/svg+xml',
	txt: 'text/plain',
	webp: 'image/webp',
}

const FILE_PREFIX = '/api/file/'

const STATIC_ASSETS = new Set([
	'/favicon.svg',
	'/favicon-96x96.png',
	'/favicon.ico',
	'/apple-touch-icon.png',
	'/robots.txt',
])

const tanstackFetch = createStartHandler(defaultStreamHandler)

function serveR2(object: R2ObjectBody, ext: string | undefined): Response {
	const contentType = (ext && MIME_MAP[ext]) ?? 'application/octet-stream'
	return new Response(object.body, {
		headers: {
			'Content-Type': contentType,
			'Cache-Control': 'public, max-age=31536000, immutable',
		},
	})
}

const server = {
	async fetch(...args: Parameters<typeof tanstackFetch>) {
		const [request] = args
		const url = new URL(request.url)

		// Static asset redirects (favicon, robots.txt, etc.)
		if (STATIC_ASSETS.has(url.pathname)) {
			const key = url.pathname.slice(1)
			const r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL as string | undefined

			if (!import.meta.env.DEV && r2PublicUrl) {
				return new Response(null, {
					status: 301,
					headers: { Location: `${r2PublicUrl}/${key}` },
				})
			}

			// Dev mode or no R2 public URL: proxy from local R2
			const object = await env.taki_bucket.get(key)
			if (!object) {
				return new Response('Not found', { status: 404 })
			}
			const ext = key.split('.').pop()?.toLowerCase()
			return serveR2(object, ext)
		}

		// Serve R2 files at /api/file/{path}
		if (url.pathname.startsWith(FILE_PREFIX)) {
			const path = url.pathname.slice(FILE_PREFIX.length)
			if (!path) {
				return new Response('Not found', { status: 404 })
			}

			const object = await env.taki_bucket.get(path)
			if (!object) {
				return new Response('Not found', { status: 404 })
			}

			const ext = path.split('.').pop()?.toLowerCase()
			return serveR2(object, ext)
		}

		return tanstackFetch(...args)
	},
}

export default server
