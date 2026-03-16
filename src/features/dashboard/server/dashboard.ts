import { createServerFn } from '@tanstack/react-start'
import { getDb } from '~/server/database/client'
import {
	deleteContentRecord,
	renderMarkdownPreview,
	uploadDashboardImage,
	upsertContent,
} from './mutations'
import { fetchContentForEdit, fetchDashboardStats, fetchPublishedAt } from './queries'
import { nowIso } from './shared'
import type { ContentForEdit, DashboardStats, SaveContentInput } from './types'

export const getDashboardStats = createServerFn({ method: 'GET' }).handler(
	async (): Promise<DashboardStats> => {
		return fetchDashboardStats(getDb())
	},
)

export const getContentForEdit = createServerFn({ method: 'GET' }).handler(
	async ({ data }): Promise<ContentForEdit | null> => {
		const input = data as { id: string }
		return fetchContentForEdit(getDb(), input.id)
	},
)

export const saveContent = createServerFn({ method: 'POST' }).handler(
	async ({ data }): Promise<{ id: string }> => {
		const input = data as SaveContentInput
		const db = getDb()

		if (input.id) {
			const existingPublishedAt = await fetchPublishedAt(db, input.id)
			const publishedAt =
				input.isDraft === 0 && !existingPublishedAt ? nowIso() : (existingPublishedAt ?? null)
			return { id: await upsertContent(db, input, publishedAt) }
		}

		const publishedAt = input.isDraft === 0 ? nowIso() : null
		return { id: await upsertContent(db, input, publishedAt) }
	},
)

export const deleteContent = createServerFn({ method: 'POST' }).handler(
	async ({ data }): Promise<{ success: boolean }> => {
		const input = data as { id: string }
		await deleteContentRecord(getDb(), input.id)
		return { success: true }
	},
)

export const renderPreview = createServerFn({ method: 'POST' }).handler(
	async ({ data }): Promise<{ html: string }> => {
		const input = data as { markdown: string }
		return { html: await renderMarkdownPreview(input.markdown) }
	},
)

export const uploadImage = createServerFn({ method: 'POST' }).handler(
	async ({ data }): Promise<{ url: string }> => {
		const input = data as { base64: string; filename: string; contentType: string }
		return { url: await uploadDashboardImage(input) }
	},
)
