import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'
import { createServerEntry } from '@tanstack/react-start/server-entry'

const tanstackFetch = createStartHandler(defaultStreamHandler)

// Cloudflare Workers passes (request, env, ctx) at runtime.
// createServerEntry spreads args, so the extra params flow through.
export default createServerEntry({
	async fetch(request: Request, ...rest: Array<unknown>) {
		const url = new URL(request.url)

		// Serve R2 uploads at /uploads/*
		if (url.pathname.startsWith('/uploads/')) {
			const key = url.pathname.slice(1) // strip leading /
			const cfEnv = rest[0] as CloudflareEnv
			const object = await cfEnv.taki_bucket.get(key)

			if (!object) {
				return new Response('Not found', { status: 404 })
			}

			return new Response(object.body, {
				headers: {
					'content-type': object.httpMetadata?.contentType ?? 'application/octet-stream',
					'cache-control': 'public, max-age=31536000, immutable',
				},
			})
		}

		return tanstackFetch(request, ...rest)
	},
} as never)
