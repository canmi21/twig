// Title → slug. Lowercase, ASCII-word + hyphen, capped to the schema-side
// storage width. Aggressive on non-ASCII for v1 — CJK / emoji titles
// produce an empty auto-slug and rely on the author filling one in.
export function slugify(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 96);
}
