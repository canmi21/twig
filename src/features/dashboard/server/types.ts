import type { ContentType } from '~/server/database/constants'

export interface DashboardRecentItem {
	id: string
	title: string | null
	type: ContentType
	createdAt: string
	isDraft: number
}

export interface DashboardStats {
	totalCount: number
	draftCount: number
	countByType: { type: string; count: number }[]
	recentItems: DashboardRecentItem[]
}

export interface ContentForEdit {
	id: string
	type: ContentType
	title: string | null
	slug: string | null
	content: string
	summary: string | null
	tags: string[]
	coverImage: string | null
	isDraft: number
	metadata: Record<string, unknown>
	createdAt: string
	updatedAt: string
	publishedAt: string | null
}

export interface SaveContentInput {
	id?: string
	type: ContentType
	title: string
	slug: string
	content: string
	summary?: string
	tags?: string[]
	coverImage?: string
	isDraft: number
	metadata?: Record<string, unknown>
}
