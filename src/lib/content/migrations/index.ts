// Content-shape migrations. Pure `(doc) => doc` transforms, numbered like
// Drizzle's SQL migrations but operating on the JSON tree stored in
// `posts.content_json`. Append new entries to `migrations` in version order;
// caller (save path / KV-miss fallback) is responsible for persisting the
// upgraded doc and invalidating the rendered artifact in CACHE.

export type Migration = {
	from: number;
	to: number;
	up: (doc: unknown) => unknown;
};

const migrations: Migration[] = [];

export function runMigrations(
	doc: unknown,
	fromVersion: number
): { doc: unknown; version: number } {
	let current = doc;
	let version = fromVersion;
	for (const m of migrations) {
		if (m.from === version) {
			current = m.up(current);
			version = m.to;
		}
	}
	return { doc: current, version };
}
