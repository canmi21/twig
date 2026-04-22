import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import type { Database } from '../database';
import { mediaBlob, mediaGcQueue, mediaItem, mediaRef } from '../database/schema';
import { newId } from '../ids';
import { imageR2Key } from './r2-key';
import { sha256Hex } from './sha';
import { isWebP } from './webp';

const WEBP_MIME = 'image/webp';

export interface UploadBlob {
	bytes: Uint8Array;
	width: number;
	height: number;
}

export interface UploadExif {
	cameraMake?: string | null;
	cameraModel?: string | null;
	lensModel?: string | null;
	iso?: number | null;
	aperture?: number | null;
	shutter?: string | null;
	focalLength?: number | null;
}

export interface UploadGps {
	lat: number;
	lng: number;
}

export interface UploadInput {
	source: {
		sha256: string;
		mime: string;
		bytes: number;
		width: number;
		height: number;
	};
	display: UploadBlob;
	hq?: UploadBlob;
	thumbhash: Uint8Array;
	altText?: string | null;
	capturedAt?: number | null;
	exif?: UploadExif | null;
	gps?: UploadGps | null;
	isPublic: boolean;
	context?: string | null;
}

export interface UploadResult {
	mid: string;
	deduped: boolean;
	displaySha256: string;
	hqSha256: string | null;
}

export class UploadError extends Error {
	constructor(
		public readonly status: number,
		message: string
	) {
		super(message);
	}
}

// Secondary dedup probe: given a source sha256, is there already an item
// whose upload produced that hash? Lets the client skip the bandwidth cost
// of resending bytes it has uploaded before.
export async function findItemBySourceSha(
	db: Database,
	sourceSha256: string
): Promise<string | null> {
	const rows = await db
		.select({ id: mediaItem.id })
		.from(mediaItem)
		.where(eq(mediaItem.sourceSha256, sourceSha256))
		.limit(1);
	return rows[0]?.id ?? null;
}

export async function getMediaItem(db: Database, mid: string) {
	const rows = await db.select().from(mediaItem).where(eq(mediaItem.id, mid)).limit(1);
	return rows[0] ?? null;
}

// Admin grid listing. Items are returned newest-first using the PRIMARY KEY
// directly — UUIDv7's high 48 bits are a millisecond timestamp, so no
// separate created_at index is required. Caller is responsible for
// derived `is_public` per row.
export async function listMediaItems(db: Database, limit = 500) {
	return db.select().from(mediaItem).orderBy(desc(mediaItem.id)).limit(limit);
}

// Flip the library ref (context IS NULL) for an item. Post refs are not
// touched — their visibility tracks the post's own published state. If
// no library ref exists (shouldn't happen for items created via
// uploadMedia), inserts one to make state representable.
export async function setLibraryVisibility(
	db: Database,
	mid: string,
	isPublic: boolean
): Promise<void> {
	const existing = await db
		.select({ id: mediaRef.id })
		.from(mediaRef)
		.where(and(eq(mediaRef.itemId, mid), sql`${mediaRef.context} IS NULL`))
		.limit(1);
	if (existing[0]) {
		await db.update(mediaRef).set({ isPublic }).where(eq(mediaRef.id, existing[0].id));
		return;
	}
	await db.insert(mediaRef).values({
		id: newId(),
		itemId: mid,
		isPublic,
		context: null
	});
}

// Replace the mutable text / timestamp fields on an item. Fields whose
// corresponding key is missing from `patch` are left untouched; set to
// `null` to explicitly clear. `updatedAt` is refreshed by drizzle's
// `$onUpdate` hook, which keeps the ETag derivation honest.
export interface MediaItemPatch {
	altText?: string | null;
	capturedAt?: Date | null;
}
export async function updateMediaItem(
	db: Database,
	mid: string,
	patch: MediaItemPatch
): Promise<void> {
	const set: Record<string, unknown> = {};
	if ('altText' in patch) set.altText = patch.altText;
	if ('capturedAt' in patch) set.capturedAt = patch.capturedAt;
	if (Object.keys(set).length === 0) return;
	await db.update(mediaItem).set(set).where(eq(mediaItem.id, mid));
}

export async function getMediaBlob(db: Database, sha256: string) {
	const rows = await db
		.select()
		.from(mediaBlob)
		.where(eq(mediaBlob.contentSha256, sha256))
		.limit(1);
	return rows[0] ?? null;
}

// An item is publicly accessible iff any of its refs is public. Derived
// rather than stored because concurrent ref flips would otherwise require
// a maintenance invariant; the query is cheap with the `media_ref_item_idx`.
export async function isItemPublic(db: Database, itemId: string): Promise<boolean> {
	const rows = await db
		.select({ one: sql<number>`1` })
		.from(mediaRef)
		.where(and(eq(mediaRef.itemId, itemId), eq(mediaRef.isPublic, true)))
		.limit(1);
	return rows.length > 0;
}

// A blob is publicly reachable iff any item pointing at it (as display or
// hq variant) has any public ref. The join is two steps: blob → item → ref.
export async function isBlobPublic(db: Database, sha256: string): Promise<boolean> {
	const rows = await db
		.select({ one: sql<number>`1` })
		.from(mediaItem)
		.innerJoin(mediaRef, eq(mediaRef.itemId, mediaItem.id))
		.where(
			and(
				or(eq(mediaItem.displaySha256, sha256), eq(mediaItem.hqSha256, sha256)),
				eq(mediaRef.isPublic, true)
			)
		)
		.limit(1);
	return rows.length > 0;
}

export async function blobIsReferenced(db: Database, sha256: string): Promise<boolean> {
	const rows = await db
		.select({ one: sql<number>`1` })
		.from(mediaItem)
		.where(or(eq(mediaItem.displaySha256, sha256), eq(mediaItem.hqSha256, sha256)))
		.limit(1);
	return rows.length > 0;
}

// Upload pipeline: persist each blob content-addressed (dedup on hash),
// create the item row with derived EXIF / GPS / alt fields, and register
// the initial library ref. Source bytes are NOT stored — only their
// fingerprint and dimensions persist for the "have I uploaded this before"
// probe.
//
// Partial-failure stance: a mid-flight R2 PUT that succeeds but whose DB
// insert later fails leaves an R2 object with no `media_blob` row. The
// orphan is visible to the Cron GC sweep (R2 LIST minus `media_blob`
// keys) and gets collected there. Avoid writing rollback logic here —
// the sweep handles it idempotently.
export async function uploadMedia(
	env: Env,
	db: Database,
	input: UploadInput
): Promise<UploadResult> {
	if (!isWebP(input.display.bytes)) {
		throw new UploadError(400, 'display blob is not a valid WebP');
	}
	if (input.hq && !isWebP(input.hq.bytes)) {
		throw new UploadError(400, 'hq blob is not a valid WebP');
	}

	const existing = await findItemBySourceSha(db, input.source.sha256);
	if (existing) {
		const row = await getMediaItem(db, existing);
		if (!row) throw new UploadError(500, 'item disappeared between probe and read');
		return {
			mid: existing,
			deduped: true,
			displaySha256: row.displaySha256,
			hqSha256: row.hqSha256
		};
	}

	const displaySha = await ensureBlob(env, db, input.display);
	const hqSha = input.hq ? await ensureBlob(env, db, input.hq) : null;

	const mid = newId();
	await db.insert(mediaItem).values({
		id: mid,
		sourceSha256: input.source.sha256,
		sourceMime: input.source.mime,
		sourceBytes: input.source.bytes,
		sourceWidth: input.source.width,
		sourceHeight: input.source.height,
		displaySha256: displaySha,
		hqSha256: hqSha,
		thumbhash: input.thumbhash,
		altText: input.altText ?? null,
		capturedAt: input.capturedAt ? new Date(input.capturedAt) : null,
		cameraMake: input.exif?.cameraMake ?? null,
		cameraModel: input.exif?.cameraModel ?? null,
		lensModel: input.exif?.lensModel ?? null,
		iso: input.exif?.iso ?? null,
		aperture: input.exif?.aperture ?? null,
		shutter: input.exif?.shutter ?? null,
		focalLength: input.exif?.focalLength ?? null,
		gpsLat: input.gps?.lat ?? null,
		gpsLng: input.gps?.lng ?? null
	});

	await db.insert(mediaRef).values({
		id: newId(),
		itemId: mid,
		isPublic: input.isPublic,
		context: input.context ?? null
	});

	return { mid, deduped: false, displaySha256: displaySha, hqSha256: hqSha };
}

export interface GcResult {
	considered: number;
	deleted: number;
	requeuedReferenced: number;
}

// Drain up to `limit` rows from the GC queue. For each entry, re-check
// that no live item references the blob — if a new ref appeared between
// enqueue and sweep, quietly remove the queue row without touching R2.
// Otherwise delete the R2 object, the `media_blob` row, and the queue
// row. Idempotent: partial failures leave consistent state because every
// check happens immediately before its own write.
export async function drainGcQueue(env: Env, db: Database, limit = 50): Promise<GcResult> {
	const rows = await db
		.select({ blobSha256: mediaGcQueue.blobSha256 })
		.from(mediaGcQueue)
		.limit(limit);
	let deleted = 0;
	let requeuedReferenced = 0;

	for (const row of rows) {
		if (await blobIsReferenced(db, row.blobSha256)) {
			await db.delete(mediaGcQueue).where(eq(mediaGcQueue.blobSha256, row.blobSha256));
			requeuedReferenced += 1;
			continue;
		}
		try {
			await env.STORAGE.delete(imageR2Key(row.blobSha256));
		} catch (err) {
			console.warn('[media/gc] R2 delete failed', row.blobSha256, err);
			continue;
		}
		await db.delete(mediaBlob).where(eq(mediaBlob.contentSha256, row.blobSha256));
		await db.delete(mediaGcQueue).where(eq(mediaGcQueue.blobSha256, row.blobSha256));
		deleted += 1;
	}

	return { considered: rows.length, deleted, requeuedReferenced };
}

async function ensureBlob(env: Env, db: Database, blob: UploadBlob): Promise<string> {
	const sha = await sha256Hex(blob.bytes);
	const existing = await getMediaBlob(db, sha);
	if (existing) return sha;

	await env.STORAGE.put(imageR2Key(sha), blob.bytes, {
		httpMetadata: { contentType: WEBP_MIME }
	});
	await db.insert(mediaBlob).values({
		contentSha256: sha,
		mime: WEBP_MIME,
		bytesSize: blob.bytes.byteLength,
		width: blob.width,
		height: blob.height
	});
	return sha;
}

export interface ResolvedMedia {
	displaySha256: string;
	hqSha256: string | null;
	thumbhash: string;
	width: number;
	height: number;
}

// Batch-resolve `mid → variant data` for the publish pipeline. Returns
// only items that exist — missing mids silently drop from the map, and
// the walker treats absent entries as "render nothing" so deleting media
// doesn't nuke old posts. Dimensions are the display variant's (intrinsic
// rendering size), not the source's.
export async function resolveMediaForMids(
	db: Database,
	mids: readonly string[]
): Promise<Record<string, ResolvedMedia>> {
	if (mids.length === 0) return {};
	const items = await db
		.select({
			id: mediaItem.id,
			displaySha256: mediaItem.displaySha256,
			hqSha256: mediaItem.hqSha256,
			thumbhash: mediaItem.thumbhash
		})
		.from(mediaItem)
		.where(inArray(mediaItem.id, [...mids]));
	if (items.length === 0) return {};

	const displayShas = items.map((i) => i.displaySha256);
	const blobs = await db
		.select({
			contentSha256: mediaBlob.contentSha256,
			width: mediaBlob.width,
			height: mediaBlob.height
		})
		.from(mediaBlob)
		.where(inArray(mediaBlob.contentSha256, displayShas));
	const dims = new Map<string, { width: number; height: number }>();
	for (const b of blobs) dims.set(b.contentSha256, { width: b.width, height: b.height });

	const out: Record<string, ResolvedMedia> = {};
	for (const item of items) {
		const d = dims.get(item.displaySha256);
		if (!d) continue;
		out[item.id] = {
			displaySha256: item.displaySha256,
			hqSha256: item.hqSha256,
			thumbhash: thumbhashToBase64(item.thumbhash),
			width: d.width,
			height: d.height
		};
	}
	return out;
}

function thumbhashToBase64(value: unknown): string {
	const bytes =
		value instanceof Uint8Array
			? value
			: value instanceof ArrayBuffer
				? new Uint8Array(value)
				: new Uint8Array(value as ArrayLike<number>);
	let binary = '';
	for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
	return btoa(binary);
}

// Sync the set of `media_ref` rows tagged with `post:{postId}` to match
// the mids currently embedded in the post's doc. Delete the stale ones,
// insert the fresh ones, update `is_public` on retained rows to track the
// post's own published state. Non-post refs (library, avatar, etc) are
// untouched. Idempotent — safe to run on every save.
export async function syncPostMediaRefs(
	db: Database,
	postId: string,
	mids: readonly string[],
	postIsPublic: boolean
): Promise<void> {
	const context = `post:${postId}`;
	const existing = await db
		.select({ id: mediaRef.id, itemId: mediaRef.itemId })
		.from(mediaRef)
		.where(eq(mediaRef.context, context));

	const wanted = new Set(mids);
	const keep = new Map<string, string>(); // itemId -> refId
	const stale: string[] = [];
	for (const row of existing) {
		if (wanted.has(row.itemId)) keep.set(row.itemId, row.id);
		else stale.push(row.id);
	}

	if (stale.length > 0) {
		await db.delete(mediaRef).where(inArray(mediaRef.id, stale));
	}
	if (keep.size > 0) {
		await db
			.update(mediaRef)
			.set({ isPublic: postIsPublic })
			.where(inArray(mediaRef.id, [...keep.values()]));
	}
	const toInsert = [...wanted].filter((mid) => !keep.has(mid));
	if (toInsert.length > 0) {
		await db.insert(mediaRef).values(
			toInsert.map((mid) => ({
				id: newId(),
				itemId: mid,
				isPublic: postIsPublic,
				context
			}))
		);
	}
}

// Drop every post-scoped ref (used when a post is deleted). Does not
// touch library refs, so items uploaded via the media library and used
// elsewhere survive. GC runs separately via Cron.
export async function clearPostMediaRefs(db: Database, postId: string): Promise<void> {
	await db.delete(mediaRef).where(eq(mediaRef.context, `post:${postId}`));
}

// Admin-initiated delete path. Drop the library ref, then any context-less
// refs that may have accumulated (avatar, manual insertions). Post refs
// are kept — unpublishing the post is the right way to detach there.
// When ref count hits zero, enqueue the item's blobs for GC and remove
// the item row.
export async function deleteMediaItem(db: Database, mid: string): Promise<void> {
	const item = await getMediaItem(db, mid);
	if (!item) return;

	await db.delete(mediaRef).where(eq(mediaRef.itemId, mid));
	await db.delete(mediaItem).where(eq(mediaItem.id, mid));

	const blobs = [item.displaySha256, item.hqSha256].filter((x): x is string => !!x);
	for (const sha of blobs) {
		if (await blobIsReferenced(db, sha)) continue;
		await db.insert(mediaGcQueue).values({ blobSha256: sha }).onConflictDoNothing();
	}
}
