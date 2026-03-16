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
