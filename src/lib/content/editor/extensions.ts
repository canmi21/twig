import type { Extensions } from '@tiptap/core';
import { Bold } from '@tiptap/extension-bold';
import { Code } from '@tiptap/extension-code';
import { Document } from '@tiptap/extension-document';
import { Heading } from '@tiptap/extension-heading';
import { History } from '@tiptap/extension-history';
import { Italic } from '@tiptap/extension-italic';
import { Link } from '@tiptap/extension-link';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Strike } from '@tiptap/extension-strike';
import { Text } from '@tiptap/extension-text';
import { Underline } from '@tiptap/extension-underline';
import { ImageBlock } from './image-node';

// Tiptap config that emits exactly the shape declared in $lib/content/schema/v1.
// Drift caught by tests/content-editor-extensions.test.ts.
export function createExtensions(opts: { placeholder?: string } = {}): Extensions {
	return [
		Document,
		Paragraph,
		Text,
		Heading.extend({
			// Clamp pasted h1 / h4-h6 into the v1 range so HTML paste can never
			// land an h1 in storage. Pure JSON input bypasses parseHTML and is
			// caught by the validator instead — the documented layered defense.
			parseHTML() {
				return [
					{ tag: 'h1', attrs: { level: 2 } },
					{ tag: 'h2', attrs: { level: 2 } },
					{ tag: 'h3', attrs: { level: 3 } },
					{ tag: 'h4', attrs: { level: 3 } },
					{ tag: 'h5', attrs: { level: 3 } },
					{ tag: 'h6', attrs: { level: 3 } }
				];
			}
		}).configure({ levels: [2, 3] }),
		Bold,
		Italic,
		Strike,
		Underline,
		Code,
		Link.extend({
			addAttributes() {
				return { href: { default: null } };
			}
		}).configure({ openOnClick: false, autolink: false }),
		ImageBlock,
		History,
		Placeholder.configure({
			placeholder: ({ node }) =>
				node.type.name === 'heading'
					? `Heading ${node.attrs.level}`
					: (opts.placeholder ?? 'Start typing…')
		})
	];
}
