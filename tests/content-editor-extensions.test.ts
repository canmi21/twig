import { getSchema } from '@tiptap/core';
import { describe, expect, it } from 'vitest';
import { createExtensions } from '$lib/content/editor/extensions';
import { validateDoc, type DocV1 } from '$lib/content/schema';

const schema = getSchema(createExtensions());

function roundTrip(doc: unknown): unknown {
	return schema.nodeFromJSON(doc).toJSON();
}

describe('Tiptap extensions match schema v1', () => {
	it('round-trips a canonical doc with every node and mark unchanged', () => {
		const doc: DocV1 = {
			type: 'doc',
			content: [
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'H2' }]
				},
				{
					type: 'heading',
					attrs: { level: 3 },
					content: [{ type: 'text', text: 'H3' }]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'b', marks: [{ type: 'bold' }] },
						{ type: 'text', text: 'i', marks: [{ type: 'italic' }] },
						{ type: 'text', text: 's', marks: [{ type: 'strike' }] },
						{ type: 'text', text: 'u', marks: [{ type: 'underline' }] },
						{ type: 'text', text: 'c', marks: [{ type: 'code' }] },
						{
							type: 'text',
							text: 'l',
							marks: [{ type: 'link', attrs: { href: 'https://example.com/' } }]
						}
					]
				}
			]
		};
		const out = roundTrip(doc);
		expect(() => validateDoc(out)).not.toThrow();
		expect(out).toEqual(doc);
	});

	it('strips link attrs other than href', () => {
		const doc = {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{
							type: 'text',
							text: 'x',
							marks: [
								{
									type: 'link',
									attrs: { href: 'https://example.com/', target: '_blank', class: 'evil' }
								}
							]
						}
					]
				}
			]
		};
		const out = roundTrip(doc) as DocV1;
		expect(() => validateDoc(out)).not.toThrow();
		const block = out.content[0];
		const inline = block && block.type === 'paragraph' ? block.content?.[0] : undefined;
		expect(inline?.marks?.[0]).toEqual({
			type: 'link',
			attrs: { href: 'https://example.com/' }
		});
	});

	// Tiptap's Heading.configure({ levels }) only constrains keyboard / toolbar
	// commands; the PM schema itself accepts any integer level. The v1 validator
	// is the gate that actually keeps h1 out of storage, so we test that here.
	it('keeps h1 out via the validator (PM schema is permissive)', () => {
		const out = roundTrip({
			type: 'doc',
			content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'h1' }] }]
		});
		expect(() => validateDoc(out)).toThrow();
	});

	it('passes nested marks (bold + italic + code) through the schema', () => {
		const doc = {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{
							type: 'text',
							text: 'multi',
							marks: [{ type: 'bold' }, { type: 'italic' }, { type: 'code' }]
						}
					]
				}
			]
		};
		const out = roundTrip(doc);
		expect(() => validateDoc(out)).not.toThrow();
	});
});
