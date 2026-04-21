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

// Tiptap config that emits exactly the shape declared in $lib/content/schema/v1.
// Drift caught by tests/content-editor-extensions.test.ts.
export function createExtensions(opts: { placeholder?: string } = {}): Extensions {
	return [
		Document,
		Paragraph,
		Text,
		Heading.configure({ levels: [2, 3] }),
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
		History,
		Placeholder.configure({ placeholder: opts.placeholder ?? '' })
	];
}
