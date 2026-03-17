import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'
import { env } from 'cloudflare:workers'

const MIME_MAP: Record<string, string> = {
	gif: 'image/gif',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
}

const FILE_PREFIX = '/api/file/'

const tanstackFetch = createStartHandler(defaultStreamHandler)

const server = {
	async fetch(...args: Parameters<typeof tanstackFetch>) {
		const [request] = args
		const url = new URL(request.url)

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
			const contentType = (ext && MIME_MAP[ext]) ?? 'application/octet-stream'

			return new Response(object.body, {
				headers: {
					'Content-Type': contentType,
					'Cache-Control': 'public, max-age=31536000, immutable',
				},
			})
		}

		return tanstackFetch(...args)
	},
}

export default server
