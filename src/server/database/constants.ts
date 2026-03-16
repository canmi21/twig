export const ContentType = {
	NOTE: 'note',
	POST: 'post',
} as const

export type ContentType = (typeof ContentType)[keyof typeof ContentType]

export const ContentStatus = {
	DRAFT: 'draft',
	PUBLISHED: 'published',
} as const

export type ContentStatus = (typeof ContentStatus)[keyof typeof ContentStatus]
