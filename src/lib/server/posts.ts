import { desc, eq } from 'drizzle-orm';
import { compileDoc, extractMediaIds } from '$lib/content/render/walker';
import { SAFE_DOMAINS } from '$lib/content/render/safe-domains';
import { CURRENT_SCHEMA_VERSION, type DocV1 } from '$lib/content/schema';
import type { Database } from './database';
import { posts } from './database/schema';
import { newId } from './ids';
import { clearPostMediaRefs, resolveMediaForMids, syncPostMediaRefs } from './media/service';

export type PostRow = typeof posts.$inferSelect;

export async function listPosts(db: Database): Promise<PostRow[]> {
	return db.select().from(posts).orderBy(desc(posts.updatedAt));
}

export async function getPost(db: Database, id: string): Promise<PostRow | null> {
	const rows = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
	return rows[0] ?? null;
}

// Creates a draft row with a freshly minted UUIDv7 (32-hex) and a slug
// seeded from the id tail, so every post is immediately addressable by
// /@/editor/[id]. The author renames slug later.
export async function createEmptyPost(db: Database): Promise<string> {
	const id = newId();
	const slug = `draft-${id.slice(-10)}`;
	const emptyDoc: DocV1 = { type: 'doc', content: [] };
	await db.insert(posts).values({
		id,
		slug,
		title: '',
		contentJson: JSON.stringify(emptyDoc),
		schemaVersion: CURRENT_SCHEMA_VERSION
	});
	return id;
}

export interface SavePatch {
	title: string;
	slug: string;
	description: string | null;
	doc: DocV1;
}

// Atomic enough: D1 is the source of truth (fails fast on unique-slug
// collision), CACHE is derivative — if the KV write fails the read path
// can always recompile from D1. No cross-store transaction needed.
//
// The save flow is a three-step pipeline:
//   1. Persist the doc JSON as authoritative editor state.
//   2. Pre-resolve embedded mids → variant metadata and sync media_ref
//      rows so each image carries a per-post ref that tracks the post's
//      publish state. Missing mids silently drop (walker renders nothing).
//   3. Compile HTML with resolved media baked in, write to KV cache.
// Steps 2 and 3 run on the resolved snapshot — if a post references a
// media item that the library later deletes, the next save recompiles to
// whatever remains rather than carrying stale URLs.
export async function savePostContent(
	db: Database,
	cache: KVNamespace,
	id: string,
	patch: SavePatch
): Promise<void> {
	await db
		.update(posts)
		.set({
			title: patch.title,
			slug: patch.slug,
			description: patch.description,
			contentJson: JSON.stringify(patch.doc),
			schemaVersion: CURRENT_SCHEMA_VERSION
		})
		.where(eq(posts.id, id));

	const postRow = await getPost(db, id);
	const isPublic = postRow?.publishedAt != null;

	const mids = extractMediaIds(patch.doc);
	const resolved = await resolveMediaForMids(db, mids);
	// Only sync refs for mids that actually exist — a doc referencing a
	// deleted item shouldn't keep that mid alive as a ref.
	await syncPostMediaRefs(db, id, Object.keys(resolved), isPublic);

	const compiled = compileDoc(patch.doc, {
		safeDomains: SAFE_DOMAINS,
		media: resolved
	});
	await cache.put(
		`post:rendered:${id}`,
		JSON.stringify({
			html: compiled.html,
			plain: compiled.plain,
			toc: compiled.toc,
			schemaVersion: CURRENT_SCHEMA_VERSION,
			compiledAt: Date.now()
		})
	);
}

// Flipping publish state must also flip every `post:{id}` media_ref's
// is_public, since that's how the image endpoint decides whether a
// variant can be served from a public immutable cache or must stay
// origin-private.
export async function setPublished(
	db: Database,
	id: string,
	publishedAt: Date | null
): Promise<void> {
	await db.update(posts).set({ publishedAt }).where(eq(posts.id, id));

	const post = await getPost(db, id);
	if (!post) return;
	const doc = safeParseDoc(post.contentJson);
	if (!doc) return;
	const mids = extractMediaIds(doc);
	if (mids.length === 0) return;
	const resolved = await resolveMediaForMids(db, mids);
	await syncPostMediaRefs(db, id, Object.keys(resolved), publishedAt != null);
}

export async function deletePost(db: Database, cache: KVNamespace, id: string): Promise<void> {
	// Drop post refs first so the media GC can catch items that were only
	// kept alive by this post. D1 lacks cross-store transactions; the
	// worst-case interleaving (post row gone, ref rows lingering) is
	// harmless — refs with nonexistent context are unreachable from
	// production queries and will be reaped on the next save cycle.
	await clearPostMediaRefs(db, id);
	await db.delete(posts).where(eq(posts.id, id));
	await cache.delete(`post:rendered:${id}`);
}

function safeParseDoc(json: string): DocV1 | null {
	try {
		return JSON.parse(json) as DocV1;
	} catch {
		return null;
	}
}
