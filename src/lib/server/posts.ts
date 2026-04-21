import { desc, eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { compileDoc } from '$lib/content/render/walker';
import { SAFE_DOMAINS } from '$lib/content/render/safe-domains';
import { CURRENT_SCHEMA_VERSION, type DocV1 } from '$lib/content/schema';
import type { Database } from './database';
import { posts } from './database/schema';

export type PostRow = typeof posts.$inferSelect;

export async function listPosts(db: Database): Promise<PostRow[]> {
	return db.select().from(posts).orderBy(desc(posts.updatedAt));
}

export async function getPost(db: Database, id: string): Promise<PostRow | null> {
	const rows = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
	return rows[0] ?? null;
}

// Creates a draft row with a freshly minted lowercase ULID and a slug
// seeded from the id tail, so every post is immediately addressable by
// /@/editor/[id]. The author renames slug later.
export async function createEmptyPost(db: Database): Promise<string> {
	const id = ulid().toLowerCase();
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

	const compiled = compileDoc(patch.doc, { safeDomains: SAFE_DOMAINS });
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

export async function setPublished(
	db: Database,
	id: string,
	publishedAt: Date | null
): Promise<void> {
	await db.update(posts).set({ publishedAt }).where(eq(posts.id, id));
}

export async function deletePost(db: Database, cache: KVNamespace, id: string): Promise<void> {
	await db.delete(posts).where(eq(posts.id, id));
	await cache.delete(`post:rendered:${id}`);
}
