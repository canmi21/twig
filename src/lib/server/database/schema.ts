// Re-run `bunx @better-auth/cli generate` then `just database-generate`
// whenever the auth plugin set changes; app-specific tables go here directly.
export * from './auth-schema';

import { sql } from 'drizzle-orm';
import { blob, index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Structured-content posts. `content_json` holds a Tiptap/ProseMirror JSON
// document conforming to the schema declared in `$lib/content/schema` at
// the version stored in `schema_version`. Migrations transform doc shape in
// code (see `$lib/content/migrations`), separate from Drizzle SQL migrations.
export const posts = sqliteTable(
	'posts',
	{
		id: text('id').primaryKey(),
		slug: text('slug').notNull().unique(),
		title: text('title').notNull(),
		description: text('description'),
		contentJson: text('content_json').notNull(),
		schemaVersion: integer('schema_version').notNull().default(1),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		publishedAt: integer('published_at', { mode: 'timestamp_ms' })
	},
	(table) => [index('posts_published_at_idx').on(table.publishedAt)]
);

// Physical byte layer — one row per unique content hash. R2 holds the actual
// bytes under key `image/{sha[0:2]}/{sha[2:4]}/{sha}`; this row is the
// metadata side. Only inserted by the upload pipeline after EXIF strip +
// canonical encode. Content is immutable; delete happens via `media_gc_queue`
// after ref count drops to zero.
export const mediaBlob = sqliteTable('media_blob', {
	contentSha256: text('content_sha256').primaryKey(),
	mime: text('mime').notNull(),
	bytesSize: integer('bytes_size').notNull(),
	width: integer('width').notNull(),
	height: integer('height').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull()
});

// Logical image layer — one row per uploaded media item. Points at one or two
// blobs (display always, hq when source long edge ≥ 2560). `source_*` fields
// fingerprint the original upload for dedup probing; the source bytes are not
// stored. EXIF fields populate per upload-time toggles; GPS is a separate
// toggle from other camera metadata. `captured_at` is user-editable and may
// differ from what EXIF originally reported.
export const mediaItem = sqliteTable(
	'media_item',
	{
		id: text('id').primaryKey(),
		sourceSha256: text('source_sha256').notNull(),
		sourceMime: text('source_mime').notNull(),
		sourceBytes: integer('source_bytes').notNull(),
		sourceWidth: integer('source_width').notNull(),
		sourceHeight: integer('source_height').notNull(),
		displaySha256: text('display_sha256')
			.notNull()
			.references(() => mediaBlob.contentSha256),
		hqSha256: text('hq_sha256').references(() => mediaBlob.contentSha256),
		thumbhash: blob('thumbhash').notNull(),
		altText: text('alt_text'),
		capturedAt: integer('captured_at', { mode: 'timestamp_ms' }),
		cameraMake: text('camera_make'),
		cameraModel: text('camera_model'),
		lensModel: text('lens_model'),
		iso: integer('iso'),
		aperture: real('aperture'),
		shutter: text('shutter'),
		focalLength: real('focal_length'),
		gpsLat: real('gps_lat'),
		gpsLng: real('gps_lng'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [index('media_item_source_idx').on(table.sourceSha256)]
);

// Usage layer — one row per place an item is referenced (post, avatar, etc).
// `is_public` is per-ref; an item is publicly accessible iff any ref is
// public (derived, not stored on the item). `context` is free-form; the
// publish pipeline writes `post:{id}` so refs can be located when a post is
// unpublished or deleted.
export const mediaRef = sqliteTable(
	'media_ref',
	{
		id: text('id').primaryKey(),
		itemId: text('item_id')
			.notNull()
			.references(() => mediaItem.id),
		isPublic: integer('is_public', { mode: 'boolean' }).notNull(),
		context: text('context'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [
		index('media_ref_item_idx').on(table.itemId),
		index('media_ref_context_idx').on(table.context)
	]
);

// Deferred-delete queue for blobs whose last ref has been dropped. A Cron
// handler drains this periodically: for each row, re-check that the blob is
// still orphaned, then delete the R2 object and the `media_blob` row. This
// two-phase pattern avoids half-deleted state on transient failures and
// makes the job idempotent.
export const mediaGcQueue = sqliteTable('media_gc_queue', {
	blobSha256: text('blob_sha256').primaryKey(),
	queuedAt: integer('queued_at', { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull()
});
