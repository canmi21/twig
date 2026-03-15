import { desc, count, eq, sql } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import { getDb } from '~/server/database'
import { posts } from '~/server/database/schema'

const POSTS_PER_PAGE = 10
const PREVIEW_LENGTH = 500

export interface PostPreview {
	slug: string
	title: string
	content: string
	createdAt: number
}

export interface PaginatedPosts {
	posts: PostPreview[]
	totalPages: number
	currentPage: number
}

export interface PostDetail {
	id: number
	slug: string
	title: string
	content: string
	createdAt: number
	updatedAt: number
}

export const getPostsPaginated = createServerFn({ method: 'GET' }).handler(
	async ({ data }): Promise<PaginatedPosts> => {
		const input = data as { page?: number } | undefined
		const page = Math.max(1, input?.page ?? 1)
		const db = getDb()

		const [{ total }] = await db.select({ total: count() }).from(posts)
		const totalPages = Math.max(1, Math.ceil(total / POSTS_PER_PAGE))
		const offset = (page - 1) * POSTS_PER_PAGE

		const rows = await db
			.select({
				slug: posts.slug,
				title: posts.title,
				content: sql<string>`substr(${posts.content}, 1, ${PREVIEW_LENGTH})`.as('content'),
				createdAt: posts.createdAt,
			})
			.from(posts)
			.orderBy(desc(posts.createdAt))
			.limit(POSTS_PER_PAGE)
			.offset(offset)

		return {
			posts: rows.map((row) => ({
				...row,
				content: truncateAtBoundary(row.content, PREVIEW_LENGTH),
				createdAt: row.createdAt.getTime(),
			})),
			totalPages,
			currentPage: page,
		}
	},
)

export const getPostBySlug = createServerFn({ method: 'GET' }).handler(
	async ({ data }): Promise<PostDetail | null> => {
		const input = data as { slug: string }
		const db = getDb()

		const [post] = await db.select().from(posts).where(eq(posts.slug, input.slug)).limit(1)

		if (!post) return null

		return {
			...post,
			createdAt: post.createdAt.getTime(),
			updatedAt: post.updatedAt.getTime(),
		}
	},
)

/** Truncate content at a word/line boundary to avoid cutting mid-word. */
function truncateAtBoundary(text: string, maxLen: number): string {
	if (text.length <= maxLen) return text

	const truncated = text.slice(0, maxLen)
	const lastNewline = truncated.lastIndexOf('\n')
	const lastSpace = truncated.lastIndexOf(' ')
	const boundary = Math.max(lastNewline, lastSpace)

	return (boundary > maxLen * 0.5 ? truncated.slice(0, boundary) : truncated) + '...'
}
