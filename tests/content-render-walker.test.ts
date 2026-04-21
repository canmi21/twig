import { describe, expect, it } from 'vitest';
import { compileDoc } from '$lib/content/render/walker';
import type { DocV1 } from '$lib/content/schema';
import { slugify } from '$lib/content/slug';

const SAFE = ['example.com'] as const;

describe('compileDoc — HTML output', () => {
	it('emits <p>...</p> for paragraphs', () => {
		const doc: DocV1 = {
			type: 'doc',
			content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }]
		};
		expect(compileDoc(doc, { safeDomains: SAFE }).html).toBe('<p>hello</p>');
	});

	it('wraps each mark with its matching tag', () => {
		const doc: DocV1 = {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'b', marks: [{ type: 'bold' }] },
						{ type: 'text', text: 'i', marks: [{ type: 'italic' }] },
						{ type: 'text', text: 's', marks: [{ type: 'strike' }] },
						{ type: 'text', text: 'u', marks: [{ type: 'underline' }] },
						{ type: 'text', text: 'c', marks: [{ type: 'code' }] }
					]
				}
			]
		};
		const { html } = compileDoc(doc, { safeDomains: SAFE });
		expect(html).toBe('<p><strong>b</strong><em>i</em><s>s</s><u>u</u><code>c</code></p>');
	});

	it('same-domain links stay in the same window', () => {
		const doc: DocV1 = {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{
							type: 'text',
							text: 'here',
							marks: [{ type: 'link', attrs: { href: 'https://example.com/x' } }]
						}
					]
				}
			]
		};
		const { html } = compileDoc(doc, { safeDomains: SAFE });
		expect(html).toContain('<a href="https://example.com/x">here</a>');
		expect(html).not.toContain('target=');
	});

	it('external links get target=_blank + rel=noopener noreferrer', () => {
		const doc: DocV1 = {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{
							type: 'text',
							text: 'out',
							marks: [{ type: 'link', attrs: { href: 'https://other.test/' } }]
						}
					]
				}
			]
		};
		const { html } = compileDoc(doc, { safeDomains: SAFE });
		expect(html).toContain('target="_blank"');
		expect(html).toContain('rel="noopener noreferrer"');
	});

	it('escapes HTML-unsafe text content', () => {
		const doc: DocV1 = {
			type: 'doc',
			content: [{ type: 'paragraph', content: [{ type: 'text', text: '<script>&"' }] }]
		};
		const { html } = compileDoc(doc, { safeDomains: SAFE });
		expect(html).toBe('<p>&lt;script&gt;&amp;"</p>');
	});

	it('emits heading tags at the declared level with slug ids', () => {
		const doc: DocV1 = {
			type: 'doc',
			content: [
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'First section' }]
				},
				{ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Deep point' }] }
			]
		};
		const { html, toc } = compileDoc(doc, { safeDomains: SAFE });
		expect(html).toContain('<h2 id="first-section">First section</h2>');
		expect(html).toContain('<h3 id="deep-point">Deep point</h3>');
		expect(toc).toEqual([
			{ level: 2, text: 'First section', id: 'first-section' },
			{ level: 3, text: 'Deep point', id: 'deep-point' }
		]);
	});

	it('deduplicates heading anchor ids', () => {
		const doc: DocV1 = {
			type: 'doc',
			content: [
				{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Intro' }] },
				{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Intro' }] }
			]
		};
		const { toc } = compileDoc(doc, { safeDomains: SAFE });
		expect(toc[0]!.id).toBe('intro');
		expect(toc[1]!.id).toBe('intro-2');
	});
});

describe('compileDoc — plain-text output', () => {
	it('concatenates block text with blank-line separators', () => {
		const doc: DocV1 = {
			type: 'doc',
			content: [
				{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Title' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'body' }] }
			]
		};
		expect(compileDoc(doc, { safeDomains: SAFE }).plain).toBe('Title\n\nbody');
	});
});

describe('slugify', () => {
	it('lowercases and hyphenates', () => {
		expect(slugify('Hello World')).toBe('hello-world');
	});

	it('strips punctuation', () => {
		expect(slugify('What, is This?!')).toBe('what-is-this');
	});

	it('collapses repeated hyphens', () => {
		expect(slugify('a   --  b')).toBe('a-b');
	});

	it('returns empty for fully-non-ASCII input', () => {
		expect(slugify('你好')).toBe('');
	});
});
