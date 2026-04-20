import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, validateDoc, type DocV1 } from '$lib/content/schema';
import { runMigrations } from '$lib/content/migrations';

const baseDoc: DocV1 = {
	type: 'doc',
	content: [
		{
			type: 'heading',
			attrs: { level: 2 },
			content: [{ type: 'text', text: 'Hi' }]
		},
		{
			type: 'paragraph',
			content: [
				{ type: 'text', text: 'a', marks: [{ type: 'bold' }] },
				{ type: 'text', text: 'b', marks: [{ type: 'italic' }] },
				{ type: 'text', text: 'c', marks: [{ type: 'strike' }] },
				{ type: 'text', text: 'd', marks: [{ type: 'underline' }] },
				{ type: 'text', text: 'e', marks: [{ type: 'code' }] },
				{
					type: 'text',
					text: 'f',
					marks: [{ type: 'link', attrs: { href: 'https://example.com/' } }]
				}
			]
		}
	]
};

describe('validateDoc v1', () => {
	it('accepts a canonical doc exercising every node and mark type', () => {
		expect(() => validateDoc(baseDoc)).not.toThrow();
	});

	it('returns a typed value on success', () => {
		const result = validateDoc(baseDoc);
		expect(result.type).toBe('doc');
		expect(result.content).toHaveLength(2);
	});

	it('rejects unknown block types (e.g. blockquote not in v1)', () => {
		expect(() =>
			validateDoc({ type: 'doc', content: [{ type: 'blockquote', content: [] }] })
		).toThrow();
	});

	it('rejects h1 — reserved for the post title column', () => {
		expect(() =>
			validateDoc({
				type: 'doc',
				content: [{ type: 'heading', attrs: { level: 1 }, content: [] }]
			})
		).toThrow();
	});

	it('rejects h4 — body headings capped at h3', () => {
		expect(() =>
			validateDoc({
				type: 'doc',
				content: [{ type: 'heading', attrs: { level: 4 }, content: [] }]
			})
		).toThrow();
	});

	it('rejects link marks without a valid href', () => {
		expect(() =>
			validateDoc({
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: 'x',
								marks: [{ type: 'link', attrs: { href: 'not a url' } }]
							}
						]
					}
				]
			})
		).toThrow();
	});

	it('rejects unknown mark types', () => {
		expect(() =>
			validateDoc({
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [{ type: 'text', text: 'x', marks: [{ type: 'highlight' }] }]
					}
				]
			})
		).toThrow();
	});

	it('rejects a doc missing the content array', () => {
		expect(() => validateDoc({ type: 'doc' })).toThrow();
	});

	it('rejects a non-object input', () => {
		expect(() => validateDoc('hello')).toThrow();
		expect(() => validateDoc(null)).toThrow();
	});

	it('rejects marks on non-text nodes (strict unknown-key rejection)', () => {
		expect(() =>
			validateDoc({
				type: 'doc',
				content: [{ type: 'paragraph', content: [], marks: [{ type: 'bold' }] }]
			})
		).toThrow();
	});

	it('rejects extra keys on text nodes', () => {
		expect(() =>
			validateDoc({
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [{ type: 'text', text: 'x', color: 'red' }]
					}
				]
			})
		).toThrow();
	});
});

describe('runMigrations (E1 passthrough)', () => {
	it('returns the doc unchanged at the current version', () => {
		const out = runMigrations(baseDoc, CURRENT_SCHEMA_VERSION);
		expect(out.doc).toBe(baseDoc);
		expect(out.version).toBe(CURRENT_SCHEMA_VERSION);
	});

	it('passes through arbitrary input without registered migrations', () => {
		const out = runMigrations({ anything: true }, 0);
		expect(out.version).toBe(0);
	});
});
