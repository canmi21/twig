import type { ContentType } from '~/server/database/constants'

export interface TimelineProjectSummary {
	status: string
	demoUrl: string | null
	repoUrl: string | null
	techStack: string[]
	role: string | null
}

export interface TimelineMediaSummary {
	mediaType: string
	rating: number | null
	creator: string | null
	cover: string | null
	year: number | null
	comment: string | null
}

export interface TimelineItem {
	id: string
	type: ContentType
	title: string | null
	contentHtml: string
	summary: string | null
	tags: string[]
	coverImage: string | null
	slug: string | null
	metadata: Record<string, unknown>
	createdAt: string
	publishedAt: string | null
	project?: TimelineProjectSummary
	media?: TimelineMediaSummary
}

export interface CursorTimeline {
	items: TimelineItem[]
	nextCursor: string | null
}

export interface PaginatedTimeline {
	items: TimelineItem[]
	totalPages: number
	currentPage: number
}

export interface ContentProjectDetail extends TimelineProjectSummary {
	screenshots: string[]
}

export interface ContentMediaDetail extends TimelineMediaSummary {
	finishedAt: string | null
}

export interface ContentDetail {
	id: string
	type: ContentType
	title: string | null
	contentHtml: string
	summary: string | null
	tags: string[]
	coverImage: string | null
	slug: string | null
	metadata: Record<string, unknown>
	createdAt: string
	updatedAt: string
	publishedAt: string | null
	project?: ContentProjectDetail
	media?: ContentMediaDetail
}
