/* drizzle/seed/posts.ts */

import type { RunSql } from './types'

const MARKDOWN_SHOWCASE = `---
title: Markdown Rendering Showcase
tags: [markdown, testing, showcase]
---

This post demonstrates every common Markdown feature to verify rendering quality across the site.

## Headings

### Third Level Heading

#### Fourth Level Heading

##### Fifth Level Heading

###### Sixth Level Heading

---

## Paragraphs and Inline Formatting

This is a regular paragraph with **bold text**, *italic text*, and ***bold italic*** combined. You can also use ~~strikethrough~~ to cross things out. Here is some \`inline code\` within a sentence, and here is a [hyperlink](https://example.com) for good measure.

This is a second paragraph to test spacing between blocks. It contains a longer run of text to see how line wrapping behaves under the liquid glass navbar when you scroll this content behind it. The adaptive tint should respond to this dense text region by increasing the glass opacity.

## Blockquotes

> This is a blockquote. It can contain **bold**, *italic*, and \`code\`.
>
> It can also span multiple paragraphs within the same quote block.

> Nested blockquotes:
>
> > This is a nested blockquote inside another one.
> >
> > It goes deeper.

## Lists

### Unordered List

- First item with some description text
- Second item
  - Nested item A
  - Nested item B
    - Deeply nested item
- Third item

### Ordered List

1. Step one: initialize the project
2. Step two: install dependencies
3. Step three: configure the environment
   1. Sub-step: create \`.env\` file
   2. Sub-step: add database credentials
4. Step four: run the development server

### Task List

- [x] Design the liquid glass effect
- [x] Implement SVG displacement maps
- [x] Add adaptive tint algorithm
- [ ] Performance optimization
- [ ] Cross-browser testing

## Code Blocks

### Inline Code

Use \`bun run dev\` to start the development server. The config lives in \`wrangler.jsonc\`.

### Fenced Code Block (TypeScript)

\`\`\`typescript
interface LiquidGlassParams {
  width: number
  height: number
  radius: number
  bezelWidth: number
  glassThickness: number
  refractiveIndex?: number
}

function createLiquidGlassAsset(params: LiquidGlassParams) {
  const { width, height, radius, bezelWidth, glassThickness } = params
  const dpr = window.devicePixelRatio || 1

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)

  return canvas.toDataURL('image/png')
}
\`\`\`

### Fenced Code Block (CSS)

\`\`\`css
.glass-overlay {
  backdrop-filter: saturate(1.2) blur(12px) brightness(0.95);
  -webkit-backdrop-filter: saturate(1.2) blur(12px) brightness(0.95);
  border-radius: 24px;
  box-shadow:
    inset 0 0 0 0.5px rgba(255, 255, 255, 0.15),
    inset 0 0.5px 0 0.5px rgba(255, 255, 255, 0.1);
}
\`\`\`

### Fenced Code Block (Shell)

\`\`\`bash
# Clone and set up the project
git clone https://github.com/example/taki.git
cd taki
bun install
bun run db:fresh
bun run dev
\`\`\`

## Tables

| Feature | Chrome | Firefox | Safari |
|---------|--------|---------|--------|
| \`backdrop-filter: blur()\` | Yes | Yes | Yes |
| \`backdrop-filter: url(#svg)\` | Yes | No | No |
| \`color-mix()\` | 111+ | 113+ | 16.2+ |
| \`feDisplacementMap\` | Yes | Yes | Yes |

### Aligned Table

| Left Aligned | Center Aligned | Right Aligned |
|:-------------|:--------------:|--------------:|
| Cell 1       | Cell 2         | Cell 3        |
| Longer text  | Short          | 12345         |
| Data row     | Another cell   | Final         |

## Images

Images would normally appear here, but this seed uses placeholder references:

![A descriptive alt text for the placeholder image](https://picsum.photos/seed/markdown-test/800/400)

## Horizontal Rules

Content above the rule.

---

Content below the rule.

***

Another rule style.

## Links

- [External link](https://example.com) to an outside resource
- [Link with title](https://example.com "Example Title") shows a tooltip on hover
- Autolinked URL: https://example.com

## Emphasis Combinations

- **Bold text** for strong emphasis
- *Italic text* for subtle emphasis
- ***Bold and italic*** for maximum emphasis
- ~~Struck through~~ for deleted content
- **Bold with *nested italic* inside**
- *Italic with **nested bold** inside*

## Footnotes

This sentence has a footnote reference[^1].

And another one here[^note].

[^1]: This is the first footnote content.
[^note]: This is a named footnote with a longer explanation that spans enough text to demonstrate wrapping behavior in the footnote area.

## Math (if supported)

Inline math: $E = mc^2$

Block math:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

## HTML Entities and Special Characters

Arrows: left arrow (←), right arrow (→), up arrow (↑), down arrow (↓)

Dashes: en-dash (--), em-dash (---)

Quotes: "double curly" and 'single curly'

Ellipsis: ...

Copyright: (c), trademark: (tm), registered: (r)

## Long Paragraph for Scroll Testing

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer in mauris eu nibh euismod gravida. Duis ac tellus et risus vulputate vehicula. Donec lobortis risus a elit. Etiam tempor. Ut ullamcorper, ligula ut dictum pharetra, nisi nunc fringilla magna, in commodo elit erat nec turpis. Ut pharetra auctor leo.

Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Proin pharetra nonummy pede. Mauris et orci. Aenean nec lorem. In porttitor. Donec laoreet nonummy augue. Suspendisse dui purus, scelerisque at, vulputate vitae, pretium mattis, nunc. Mauris eget neque at sem venenatis eleifend. Ut nonummy. Fusce aliquet pede non pede. Suspendisse dapibus lorem pellentesque magna. Integer nulla. Donec blandit feugiat ligula. Donec hendrerit, felis et imperdiet euismod, purus ipsum pretium metus, in lacinia nulla nisl eget sapien. Donec ut est in lectus consequat consequat. Etiam eget dui. Aliquam erat volutpat.
`

export async function seedPosts(runSql: RunSql) {
	const now = new Date().toISOString()

	/* Post 1: original hello world */
	const cid1 = 'seed-post-001'
	await runSql(
		`INSERT OR REPLACE INTO contents (cid, type, status, created_at, updated_at) VALUES ('${cid1}', 'post', 'published', '${now}', '${now}')`,
	)
	await runSql(
		`INSERT OR REPLACE INTO posts (cid, title, slug, content, summary, tags) VALUES ('${cid1}', 'Hello World', 'hello-world', '---\ntitle: Hello World\ntags: [welcome, introduction]\n---\n\nThis is the first post on the blog. It demonstrates **Markdown** rendering with code blocks, lists, and more.\n\n## Getting Started\n\nWelcome to Taki, a lightweight blogging platform built with TanStack Start and Cloudflare.', 'An introductory post demonstrating the blogging platform.', '["welcome","introduction"]')`,
	)

	/* Post 2: markdown showcase */
	const cid2 = 'seed-post-002'
	const escaped = MARKDOWN_SHOWCASE.replaceAll("'", "''")
	await runSql(
		`INSERT OR REPLACE INTO contents (cid, type, status, created_at, updated_at) VALUES ('${cid2}', 'post', 'published', '${now}', '${now}')`,
	)
	await runSql(
		`INSERT OR REPLACE INTO posts (cid, title, slug, content, summary, tags) VALUES ('${cid2}', 'Markdown Rendering Showcase', 'markdown-showcase', '${escaped}', 'A comprehensive test of every Markdown feature: headings, code blocks, tables, lists, blockquotes, and more.', '["markdown","testing","showcase"]')`,
	)

	console.log('Seeded posts')
}
