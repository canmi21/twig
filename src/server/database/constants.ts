export const CONTENT_TYPES = [
	'post',
	'thought',
	'note',
	'project',
	'snippet',
	'design',
	'photo',
	'album',
	'media',
	'milestone',
	'status',
	'repost',
] as const

export type ContentType = (typeof CONTENT_TYPES)[number]

export const CONTENT_WEIGHT = {
	heavy: ['post', 'project', 'design', 'milestone'] as const,
	medium: ['note', 'snippet', 'media', 'album'] as const,
	light: ['thought', 'status', 'repost'] as const,
} as const

export type ContentWeight = keyof typeof CONTENT_WEIGHT

export const MEDIA_TYPES = ['book', 'movie', 'music', 'anime', 'game', 'podcast'] as const
export type MediaType = (typeof MEDIA_TYPES)[number]

export const PROJECT_STATUSES = ['active', 'completed', 'archived', 'planned'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export function getContentWeight(type: ContentType): ContentWeight {
	for (const [weight, types] of Object.entries(CONTENT_WEIGHT)) {
		if ((types as readonly string[]).includes(type)) return weight as ContentWeight
	}
	return 'light'
}
