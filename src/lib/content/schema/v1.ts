import { z } from 'zod';

// v1 content schema. Shape matches ProseMirror / Tiptap native JSON so the
// editor can emit it directly. Keep this file the single source of truth —
// editor config, validator, renderer, and migrations all import from here.

const markSchema = z.discriminatedUnion('type', [
	z.strictObject({ type: z.literal('bold') }),
	z.strictObject({ type: z.literal('italic') }),
	z.strictObject({ type: z.literal('strike') }),
	z.strictObject({ type: z.literal('underline') }),
	z.strictObject({ type: z.literal('code') }),
	z.strictObject({
		type: z.literal('link'),
		attrs: z.strictObject({ href: z.string().url() })
	})
]);

const inlineSchema = z.strictObject({
	type: z.literal('text'),
	text: z.string(),
	marks: z.array(markSchema).optional()
});

// h1 is reserved for the post title column; body headings are h2 or h3.
const blockSchema = z.discriminatedUnion('type', [
	z.strictObject({
		type: z.literal('paragraph'),
		content: z.array(inlineSchema).optional()
	}),
	z.strictObject({
		type: z.literal('heading'),
		attrs: z.strictObject({ level: z.union([z.literal(2), z.literal(3)]) }),
		content: z.array(inlineSchema).optional()
	})
]);

export const docSchema = z.strictObject({
	type: z.literal('doc'),
	content: z.array(blockSchema)
});

export type MarkV1 = z.infer<typeof markSchema>;
export type InlineV1 = z.infer<typeof inlineSchema>;
export type BlockV1 = z.infer<typeof blockSchema>;
export type DocV1 = z.infer<typeof docSchema>;

// Throws ZodError on invalid input; call site decides how to surface.
export function validateDoc(raw: unknown): DocV1 {
	return docSchema.parse(raw);
}
