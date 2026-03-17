import { createServerFn } from '@tanstack/react-start'
import { uploadFile } from '~/features/platform/server'
import { requireAuth } from '~/server/auth.server'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_SIZE_BYTES = 5 * 1024 * 1024

const EXT_MAP: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/gif': 'gif',
}

/**
 * Upload an image encoded as base64.
 * Client converts File → base64 string to avoid seroval serialization issues.
 */
export const uploadImage = createServerFn({ method: 'POST' })
	.inputValidator((d: { base64: string; type: string; size: number }) => {
		if (!d.base64) {
			throw new Error('File data is required')
		}
		if (!ALLOWED_TYPES.has(d.type)) {
			throw new Error(`Unsupported file type: ${d.type}`)
		}
		if (d.size > MAX_SIZE_BYTES) {
			throw new Error(`File size must not exceed ${MAX_SIZE_BYTES / 1024 / 1024}MB`)
		}
		return d
	})
	.handler(async ({ data }) => {
		await requireAuth()
		const ext = EXT_MAP[data.type] ?? 'bin'
		const binaryString = atob(data.base64)
		const bytes = new Uint8Array(binaryString.length)
		for (let idx = 0; idx < binaryString.length; idx++) {
			bytes[idx] = binaryString.charCodeAt(idx)
		}
		const path = await uploadFile('image', bytes.buffer, ext)
		return { path }
	})
