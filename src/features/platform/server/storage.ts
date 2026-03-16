import { env } from 'cloudflare:workers'

type FileCategory = 'image' | 'video' | 'audio' | 'asset'

async function sha256Hex(data: ArrayBuffer): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', data)
	const bytes = new Uint8Array(digest)
	let hex = ''
	for (const b of bytes) {
		hex += b.toString(16).padStart(2, '0')
	}
	return hex
}

/**
 * Upload a file to R2, keyed by content hash.
 * Returns the full object path: `{type}/{sha256}.{ext}`
 */
export async function uploadFile(
	type: FileCategory,
	file: ArrayBuffer | ReadableStream,
	ext: string,
): Promise<string> {
	const buffer = file instanceof ArrayBuffer ? file : await new Response(file).arrayBuffer()
	const hash = await sha256Hex(buffer)
	const path = `${type}/${hash}.${ext}`
	await env.taki_bucket.put(path, buffer)
	return path
}

export async function getFile(path: string): Promise<R2ObjectBody | null> {
	return await env.taki_bucket.get(path)
}

export async function deleteFile(path: string): Promise<void> {
	await env.taki_bucket.delete(path)
}
