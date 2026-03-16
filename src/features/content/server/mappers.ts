import type { ContentType } from '~/server/database/constants'
import {
	parseJson,
	parseTags,
	PREVIEW_LENGTH,
	type BaseContentRow,
	type MediaExtensionRow,
	type ProjectExtensionRow,
	truncateContent,
} from './shared'
import type { ContentDetail, TimelineItem } from './types'

interface ContentExtensionMaps {
	projectMap: Map<string, ProjectExtensionRow>
	mediaMap: Map<string, MediaExtensionRow>
}

interface TimelineBuildOptions {
	mode?: 'preview' | 'full'
}

export function createContentExtensionMaps(
	projectRows: ProjectExtensionRow[],
	mediaRows: MediaExtensionRow[],
): ContentExtensionMaps {
	return {
		projectMap: new Map(projectRows.map((row) => [row.contentId, row])),
		mediaMap: new Map(mediaRows.map((row) => [row.contentId, row])),
	}
}

export async function buildTimelineItems(
	rows: BaseContentRow[],
	renderMarkdown: (markdown: string) => Promise<string>,
	extensionMaps: ContentExtensionMaps,
	options: TimelineBuildOptions = {},
): Promise<TimelineItem[]> {
	const mode = options.mode ?? 'preview'

	return Promise.all(
		rows.map(async (row) =>
			buildTimelineItem(row, renderMarkdown, extensionMaps, {
				mode,
			}),
		),
	)
}

async function buildTimelineItem(
	row: BaseContentRow,
	renderMarkdown: (markdown: string) => Promise<string>,
	extensionMaps: ContentExtensionMaps,
	options: TimelineBuildOptions = {},
): Promise<TimelineItem> {
	const mode = options.mode ?? 'preview'
	const markdown = mode === 'full' ? row.content : truncateContent(row.content, PREVIEW_LENGTH)
	const contentHtml = await renderMarkdown(markdown)
	const item: TimelineItem = {
		id: row.id,
		type: row.type as ContentType,
		title: row.title,
		contentHtml,
		summary: row.summary,
		tags: parseTags(row.tags),
		coverImage: row.coverImage,
		slug: row.slug,
		metadata: parseJson(row.metadata),
		createdAt: row.createdAt,
		publishedAt: row.publishedAt,
	}

	const project = extensionMaps.projectMap.get(row.id)
	if (project) {
		item.project = {
			status: project.status,
			demoUrl: project.demoUrl,
			repoUrl: project.repoUrl,
			techStack: parseTags(project.techStack),
			role: project.role,
		}
	}

	const media = extensionMaps.mediaMap.get(row.id)
	if (media) {
		item.media = {
			mediaType: media.mediaType,
			rating: media.rating,
			creator: media.creator,
			cover: media.cover,
			year: media.year,
			comment: media.comment,
		}
	}

	return item
}

export async function buildContentDetail(
	row: BaseContentRow,
	renderMarkdown: (markdown: string) => Promise<string>,
	project?: ProjectExtensionRow,
	media?: MediaExtensionRow,
): Promise<ContentDetail> {
	const contentHtml = await renderMarkdown(row.content)
	const detail: ContentDetail = {
		id: row.id,
		type: row.type as ContentType,
		title: row.title,
		contentHtml,
		summary: row.summary,
		tags: parseTags(row.tags),
		coverImage: row.coverImage,
		slug: row.slug,
		metadata: parseJson(row.metadata),
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		publishedAt: row.publishedAt,
	}

	if (project) {
		detail.project = {
			status: project.status,
			demoUrl: project.demoUrl,
			repoUrl: project.repoUrl,
			techStack: parseTags(project.techStack),
			screenshots: parseTags(project.screenshots),
			role: project.role,
		}
	}

	if (media) {
		detail.media = {
			mediaType: media.mediaType,
			rating: media.rating,
			creator: media.creator,
			cover: media.cover,
			year: media.year,
			comment: media.comment,
			finishedAt: media.finishedAt,
		}
	}

	return detail
}
