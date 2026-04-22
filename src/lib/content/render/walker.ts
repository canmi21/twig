import type { BlockV1, DocV1, InlineV1, MarkV1 } from '$lib/content/schema';

export interface TocItem {
	level: 2 | 3;
	text: string;
	id: string;
}

export interface Compiled {
	html: string;
	plain: string;
	toc: TocItem[];
}

export interface MediaResolution {
	displaySha256: string;
	hqSha256: string | null;
	thumbhash: string;
	width: number;
	height: number;
}

export interface CompileOptions {
	safeDomains: readonly string[];
	// mid → variant data, pre-resolved by the save pipeline so the walker
	// stays pure/synchronous. Missing mids render as empty blocks rather
	// than throwing — a deleted media item shouldn't break the post.
	media?: Record<string, MediaResolution>;
}

// Pure JSON → HTML / plain-text / TOC walker. No DOM, no Svelte SSR — easy
// to unit-test and cheap to run at save time. Runs in the save pipeline
// (E2c) so read paths just stream the precomputed HTML from CACHE.
export function compileDoc(doc: DocV1, opts: CompileOptions): Compiled {
	let html = '';
	const plainParts: string[] = [];
	const toc: TocItem[] = [];
	const seenAnchors = new Set<string>();

	for (const block of doc.content) {
		html += renderBlock(block, opts, toc, seenAnchors);
		if (block.type !== 'image') {
			plainParts.push(plainFromInline(block.content ?? []));
		}
	}

	return { html, plain: plainParts.join('\n\n').trim(), toc };
}

// Walk the doc tree collecting every `mid` from image blocks. Used by the
// save pipeline to batch-resolve media before compiling.
export function extractMediaIds(doc: DocV1): string[] {
	const mids = new Set<string>();
	for (const block of doc.content) {
		if (block.type === 'image' && block.attrs.mid) mids.add(block.attrs.mid);
	}
	return [...mids];
}

function renderBlock(
	block: BlockV1,
	opts: CompileOptions,
	toc: TocItem[],
	seenAnchors: Set<string>
): string {
	if (block.type === 'image') return renderImage(block.attrs, opts);
	const inner = renderInline(block.content ?? [], opts);
	if (block.type === 'paragraph') return `<p>${inner}</p>`;
	const { level } = block.attrs;
	const text = plainFromInline(block.content ?? []);
	const id = allocateAnchor(text, seenAnchors);
	toc.push({ level, text, id });
	return `<h${level} id="${escapeAttr(id)}">${inner}</h${level}>`;
}

function renderImage(attrs: { mid: string; alt?: string | null }, opts: CompileOptions): string {
	const resolution = opts.media?.[attrs.mid];
	if (!resolution) return '';
	const src = `/api/media/image/${resolution.displaySha256}.webp`;
	const alt = attrs.alt ?? '';
	const parts = [
		`src="${escapeAttr(src)}"`,
		`alt="${escapeAttr(alt)}"`,
		`width="${resolution.width}"`,
		`height="${resolution.height}"`,
		`data-thumbhash="${escapeAttr(resolution.thumbhash)}"`,
		`data-mid="${escapeAttr(attrs.mid)}"`,
		'loading="lazy"',
		'decoding="async"'
	];
	if (resolution.hqSha256) {
		parts.push(`data-hq="/api/media/image/${resolution.hqSha256}.webp"`);
	}
	return `<img ${parts.join(' ')}>`;
}

function renderInline(inline: InlineV1[], opts: CompileOptions): string {
	return inline
		.map((node) => {
			let out = escapeHtml(node.text);
			for (const mark of node.marks ?? []) {
				out = wrapMark(out, mark, opts);
			}
			return out;
		})
		.join('');
}

function wrapMark(content: string, mark: MarkV1, opts: CompileOptions): string {
	switch (mark.type) {
		case 'bold':
			return `<strong>${content}</strong>`;
		case 'italic':
			return `<em>${content}</em>`;
		case 'strike':
			return `<s>${content}</s>`;
		case 'underline':
			return `<u>${content}</u>`;
		case 'code':
			return `<code>${content}</code>`;
		case 'link': {
			const href = mark.attrs.href;
			const safe = isSafeHost(href, opts.safeDomains);
			const attrs = safe
				? `href="${escapeAttr(href)}"`
				: `href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer"`;
			return `<a ${attrs}>${content}</a>`;
		}
	}
}

function plainFromInline(inline: InlineV1[]): string {
	return inline.map((n) => n.text).join('');
}

function escapeHtml(s: string): string {
	return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
}

function escapeAttr(s: string): string {
	return s.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);
}

function anchorSlug(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 64);
}

function allocateAnchor(text: string, seen: Set<string>): string {
	const base = anchorSlug(text) || 'section';
	let candidate = base;
	let i = 2;
	while (seen.has(candidate)) candidate = `${base}-${i++}`;
	seen.add(candidate);
	return candidate;
}

function isSafeHost(href: string, safe: readonly string[]): boolean {
	try {
		const url = new URL(href);
		return safe.includes(url.hostname);
	} catch {
		return true;
	}
}
