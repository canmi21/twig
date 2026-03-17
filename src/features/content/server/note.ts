import { createServerFn } from '@tanstack/react-start'
import { desc, eq } from 'drizzle-orm'
import { generateCid, getDb } from '~/features/platform/server'
import { ContentStatus, ContentType, contents, notes } from '~/server/database'

const TEXT_MAX_BYTES = 4096
const IMAGES_MAX_COUNT = 4
const R2_PATH_RE = /^image\/[a-f0-9]{64}\.\w+$/

function validateImages(images?: string[]): string[] {
	if (!images || images.length === 0) {
		return []
	}
	if (images.length > IMAGES_MAX_COUNT) {
		throw new Error(`Images must not exceed ${IMAGES_MAX_COUNT}`)
	}
	for (const path of images) {
		if (!R2_PATH_RE.test(path)) {
			throw new Error(`Invalid R2 path: ${path}`)
		}
	}
	return images
}

// ---------------------------------------------------------------------------
// CreateNote
// ---------------------------------------------------------------------------

export const createNote = createServerFn({ method: 'POST' })
	.inputValidator((d: { text: string; images?: string[] }) => {
		if (!d.text.trim()) {
			throw new Error('Text is required')
		}
		if (new TextEncoder().encode(d.text).byteLength > TEXT_MAX_BYTES) {
			throw new Error(`Text must not exceed ${TEXT_MAX_BYTES} bytes`)
		}
		d.images = validateImages(d.images)
		return d
	})
	.handler(async ({ data }) => {
		const db = getDb()
		const cid = generateCid()
		const now = new Date().toISOString()

		await db.insert(contents).values({
			cid,
			createdAt: now,
			status: ContentStatus.DRAFT,
			type: ContentType.NOTE,
			updatedAt: now,
		})

		await db.insert(notes).values({
			cid,
			images: JSON.stringify(data.images ?? []),
			text: data.text,
		})

		return { cid }
	})

// ---------------------------------------------------------------------------
// UpdateNote
// ---------------------------------------------------------------------------

export const updateNote = createServerFn({ method: 'POST' })
	.inputValidator((d: { cid: string; text?: string; images?: string[] }) => {
		if (d.text !== undefined && !d.text.trim()) {
			throw new Error('Text cannot be empty')
		}
		if (d.text !== undefined && new TextEncoder().encode(d.text).byteLength > TEXT_MAX_BYTES) {
			throw new Error(`Text must not exceed ${TEXT_MAX_BYTES} bytes`)
		}
		if (d.images !== undefined) {
			d.images = validateImages(d.images)
		}
		return d
	})
	.handler(async ({ data }) => {
		const db = getDb()
		const now = new Date().toISOString()

		const noteFields: Record<string, string> = {}
		if (data.text !== undefined) {
			noteFields.text = data.text
		}
		if (data.images !== undefined) {
			noteFields.images = JSON.stringify(data.images)
		}

		if (Object.keys(noteFields).length > 0) {
			await db.update(notes).set(noteFields).where(eq(notes.cid, data.cid))
		}

		await db.update(contents).set({ updatedAt: now }).where(eq(contents.cid, data.cid))
	})

// ---------------------------------------------------------------------------
// PublishNote
// ---------------------------------------------------------------------------

export const publishNote = createServerFn({ method: 'POST' })
	.inputValidator((d: { cid: string }) => d)
	.handler(async ({ data }) => {
		const db = getDb()
		const now = new Date().toISOString()

		await db
			.update(contents)
			.set({ status: ContentStatus.PUBLISHED, updatedAt: now })
			.where(eq(contents.cid, data.cid))
	})

// ---------------------------------------------------------------------------
// UnpublishNote
// ---------------------------------------------------------------------------

export const unpublishNote = createServerFn({ method: 'POST' })
	.inputValidator((d: { cid: string }) => d)
	.handler(async ({ data }) => {
		const db = getDb()
		const now = new Date().toISOString()

		await db
			.update(contents)
			.set({ status: ContentStatus.DRAFT, updatedAt: now })
			.where(eq(contents.cid, data.cid))
	})

// ---------------------------------------------------------------------------
// DeleteNote
// ---------------------------------------------------------------------------

export const deleteNote = createServerFn({ method: 'POST' })
	.inputValidator((d: { cid: string }) => d)
	.handler(async ({ data }) => {
		const db = getDb()

		// FK order: notes → contents
		await db.delete(notes).where(eq(notes.cid, data.cid))
		await db.delete(contents).where(eq(contents.cid, data.cid))
	})

// ---------------------------------------------------------------------------
// ListNotes (dashboard: all statuses)
// ---------------------------------------------------------------------------

export const listNotes = createServerFn({ method: 'GET' }).handler(async () => {
	const db = getDb()

	return db
		.select({
			cid: contents.cid,
			createdAt: contents.createdAt,
			images: notes.images,
			status: contents.status,
			text: notes.text,
			updatedAt: contents.updatedAt,
		})
		.from(contents)
		.innerJoin(notes, eq(contents.cid, notes.cid))
		.where(eq(contents.type, ContentType.NOTE))
		.orderBy(desc(contents.createdAt))
})
