import type { SaveContentInput } from '~/features/dashboard/server/dashboard'
import type { ContentType } from '~/server/database/constants'

export const PREVIEW_DEBOUNCE_MS = 500

export function slugFromTitle(title: string) {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
		.replace(/^-|-$/g, '')
}

export function buildSaveContentInput(input: {
	id?: string
	type: ContentType
	title: string
	slug: string
	content: string
	summary: string
	tags: string
	coverImage: string
}): SaveContentInput {
	return {
		id: input.id,
		type: input.type,
		title: input.title,
		slug: input.slug,
		content: input.content,
		summary: input.summary || undefined,
		tags: input.tags
			.split(',')
			.map((tag) => tag.trim())
			.filter(Boolean),
		coverImage: input.coverImage || undefined,
		isDraft: 1,
	}
}

export function insertMarkdownImage(markdown: string, cursor: number, alt: string, url: string) {
	const before = markdown.slice(0, cursor)
	const after = markdown.slice(cursor)
	return `${before}![${alt}](${url})${after}`
}

export async function fileToBase64(file: File): Promise<string> {
	const buffer = await file.arrayBuffer()
	return btoa(
		new Uint8Array(buffer).reduce((result, byte) => result + String.fromCharCode(byte), ''),
	)
}
