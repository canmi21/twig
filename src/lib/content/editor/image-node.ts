import { Node, mergeAttributes } from '@tiptap/core';

// Custom image block matching the `image` entry in $lib/content/schema/v1.
// Stores only `mid` + optional `alt` — the walker resolves variants at
// publish time so draft doc JSON is stable across encoder changes and
// doesn't carry stale sha256s.
//
// Rendered in the editor as a plain <img> with src pointed at the admin
// image endpoint. Since the editor runs as the admin, the auth cookies
// fetch the same bytes as the published site would for public items
// (and still render for private items because admin override applies).

export interface ImageAttrs {
	mid: string;
	alt: string | null;
}

export const ImageBlock = Node.create({
	name: 'image',
	group: 'block',
	atom: true,
	draggable: true,
	selectable: true,

	addAttributes() {
		return {
			mid: { default: '' },
			alt: { default: null }
		};
	},

	parseHTML() {
		return [
			{
				tag: 'img[data-mid]',
				getAttrs: (dom) => {
					const el = dom as HTMLElement;
					return {
						mid: el.getAttribute('data-mid') ?? '',
						alt: el.getAttribute('alt')
					};
				}
			}
		];
	},

	renderHTML({ node, HTMLAttributes }) {
		const attrs = node.attrs as ImageAttrs;
		// Editor preview is a placeholder block — the actual sha256 → URL
		// mapping lives on the server and is resolved at publish time. A
		// full in-editor preview would require either a NodeView that
		// fetches /api/media/object/{mid} on mount, or pre-resolving the
		// whole doc's mids in the page load and wiring a Svelte store
		// into the node. Both are polish — shipping the placeholder now
		// keeps the end-to-end path testable.
		return [
			'figure',
			mergeAttributes(HTMLAttributes, {
				'data-mid': attrs.mid,
				'data-alt': attrs.alt ?? '',
				class:
					'my-4 flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted p-6 text-center font-code text-xs text-muted-foreground'
			}),
			['span', 'media placeholder · renders at publish'],
			['span', { class: 'break-all text-[10px]' }, attrs.mid]
		];
	}
});
