import { count } from 'drizzle-orm'
import { getDb } from '~/server/database/client'
import { posts } from '~/server/database/schema'

const samplePosts = [
	{
		slug: 'welcome-to-taki',
		title: 'Welcome to taki',
		content: `# Welcome

This is the first post on **taki**, a blog built with TanStack Start and Cloudflare Workers.

## What is taki?

taki is a minimal blog platform with:

- Server-side rendering via TanStack Start
- Cloudflare D1 for persistence
- Nord color theme with dark mode
- View Transition API animations

> "Simplicity is the ultimate sophistication." -- Leonardo da Vinci

Enjoy reading!`,
	},
	{
		slug: 'getting-started-with-tanstack-start',
		title: 'Getting Started with TanStack Start',
		content: `# Getting Started with TanStack Start

TanStack Start is a full-stack React framework that combines the best parts of modern web development.

## Key Features

1. **File-based routing** -- routes live in \`src/routes/\`
2. **Server functions** -- type-safe RPC without API boilerplate
3. **SSR by default** -- pages render on the server first
4. **Streaming** -- progressive HTML delivery

## A Simple Server Function

\`\`\`typescript
import { createServerFn } from '@tanstack/react-start'

export const getGreeting = createServerFn({ method: 'GET' })
  .handler(() => {
    return { message: 'Hello from the server!' }
  })
\`\`\`

This function runs only on the server but can be called from any component.`,
	},
	{
		slug: 'cloudflare-d1-with-drizzle',
		title: 'Using Cloudflare D1 with Drizzle ORM',
		content: `# Cloudflare D1 with Drizzle ORM

D1 is Cloudflare's serverless SQLite database. Combined with Drizzle ORM, it provides a type-safe database layer at the edge.

## Schema Definition

\`\`\`typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  content: text('content').notNull(),
})
\`\`\`

## Querying

\`\`\`typescript
const allPosts = await db.select().from(posts).orderBy(desc(posts.createdAt))
\`\`\`

### Advantages

- **Zero cold starts** -- D1 is always warm
- **Global replication** -- data close to users
- **SQL compatibility** -- standard SQLite queries work`,
	},
	{
		slug: 'nord-color-theme',
		title: 'Designing with the Nord Color Palette',
		content: `# The Nord Color Palette

Nord is an arctic, north-bluish color palette designed for clean, uncluttered UI.

## The Four Groups

### Polar Night (dark backgrounds)
- \`#2E3440\` -- darkest base
- \`#3B4252\` -- elevated surfaces
- \`#434C5E\` -- subtle highlights
- \`#4C566A\` -- comments and muted text

### Snow Storm (light backgrounds)
- \`#D8DEE9\` -- muted text on dark
- \`#E5E9F0\` -- secondary surfaces
- \`#ECEFF4\` -- primary background

### Frost (accent blues)
A gradient from teal to deep blue:
- \`#8FBCBB\` \`#88C0D0\` \`#81A1C1\` \`#5E81AC\`

### Aurora (semantic colors)
- Red \`#BF616A\` -- errors, destructive actions
- Orange \`#D08770\` -- warnings
- Yellow \`#EBCB8B\` -- highlights
- Green \`#A3BE8C\` -- success
- Purple \`#B48EAD\` -- special elements

> Nord works beautifully for both light and dark themes because it was designed as a unified system from the start.`,
	},
	{
		slug: 'view-transitions-api',
		title: 'Smooth Theme Switching with View Transitions',
		content: `# View Transitions API

The View Transitions API enables smooth animated transitions between DOM states without complex JavaScript animation libraries.

## How It Works

\`\`\`typescript
document.startViewTransition(() => {
  // Update the DOM
  document.documentElement.classList.toggle('dark')
})
\`\`\`

The browser:
1. Captures the current state as a screenshot
2. Runs your callback to update the DOM
3. Captures the new state
4. Animates between the two snapshots

## Circular Wipe Effect

You can customize the animation with CSS:

\`\`\`css
::view-transition-new(root) {
  animation: none;
  z-index: 9999;
}
\`\`\`

Combined with \`clip-path\` animations in JavaScript, this creates an expanding circle reveal from the toggle button.

### Browser Support

View Transitions are supported in Chrome 111+ and Safari 18+. The implementation should always include a **fallback** for unsupported browsers.`,
	},
	{
		slug: 'markdown-rendering-on-the-edge',
		title: 'Markdown Rendering on the Edge',
		content: `# Markdown Rendering on the Edge

Rendering Markdown on edge workers requires lightweight parsers that work without Node.js built-in modules.

## Why marked?

\`marked\` is a popular choice because:

- **Small bundle** -- ~40KB minified
- **No dependencies** -- works in any JavaScript runtime
- **Fast** -- compiled regular expressions
- **Extensible** -- custom renderers and tokenizers

## Usage

\`\`\`typescript
import { marked } from 'marked'

const html = marked.parse('# Hello **world**')
\`\`\`

## Security Considerations

Always sanitize user-generated Markdown before rendering. In our case, posts are authored by the site owner, so we trust the content. For user-generated content, consider:

- DOMPurify for client-side sanitization
- A strict allowlist of HTML tags
- CSP headers to prevent script injection`,
	},
	{
		slug: 'tailwind-typography-plugin',
		title: 'Beautiful Prose with @tailwindcss/typography',
		content: `# @tailwindcss/typography

The typography plugin adds a set of \`prose\` classes that style vanilla HTML with beautiful typographic defaults.

## Before and After

Without the plugin, rendered Markdown looks unstyled -- headings have no spacing, lists lack indentation, and code blocks blend into the background.

With \`prose\` classes applied:

- Headings get proper size hierarchy and spacing
- Paragraphs have comfortable line height
- Code blocks get backgrounds and padding
- Blockquotes get a left border accent
- Lists are properly indented

## Dark Mode

\`\`\`html
<article class="prose dark:prose-invert">
  <!-- Markdown content here -->
</article>
\`\`\`

The \`prose-invert\` class flips all typographic colors for dark backgrounds. Combined with Nord's Snow Storm and Polar Night palettes, it creates excellent readability in both modes.`,
	},
	{
		slug: 'server-side-rendering-react-19',
		title: 'Server-Side Rendering with React 19',
		content: `# SSR with React 19

React 19 brings significant improvements to server-side rendering, making frameworks like TanStack Start more powerful.

## Key Improvements

### Streaming SSR
React 19 streams HTML as components resolve, reducing Time to First Byte:

\`\`\`
Server: <html><body>
Server: <header>...</header>
Server: <main> (loading...)
Server: <article>Full content</article>
Server: </main></body></html>
\`\`\`

### Selective Hydration
Only interactive components get hydrated. Static content stays as plain HTML.

### Server Components
Components that never ship JavaScript to the client:

\`\`\`typescript
// This component's code stays on the server
async function PostList() {
  const posts = await db.select().from(postsTable)
  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>
}
\`\`\`

## The Result

- Faster initial page loads
- Less JavaScript sent to the client
- Better SEO out of the box`,
	},
	{
		slug: 'edge-computing-cloudflare-workers',
		title: 'Edge Computing with Cloudflare Workers',
		content: `# Edge Computing with Cloudflare Workers

Cloudflare Workers run your code in 300+ data centers worldwide, bringing computation close to your users.

## Why Edge?

| Metric | Traditional | Edge |
|--------|-----------|------|
| Latency | 100-300ms | 10-50ms |
| Cold start | 500ms-5s | <1ms |
| Scaling | Manual | Automatic |

## Worker Bindings

Workers connect to Cloudflare services through **bindings**:

- **D1** -- SQLite database
- **R2** -- Object storage (S3-compatible)
- **KV** -- Key-value store
- **Durable Objects** -- stateful coordination

## Configuration

\`\`\`jsonc
// wrangler.jsonc
{
  "d1_databases": [{
    "binding": "DB",
    "database_name": "my-database"
  }]
}
\`\`\`

Each binding is available as \`env.DB\`, \`env.ASSETS\`, etc. in your worker code.`,
	},
	{
		slug: 'file-based-routing-patterns',
		title: 'File-Based Routing in TanStack Router',
		content: `# File-Based Routing

TanStack Router uses the file system to define routes, making navigation intuitive and discoverable.

## Route Structure

\`\`\`
src/routes/
  __root.tsx      -> Layout wrapper
  index.tsx       -> /
  about.tsx       -> /about
  post/
    $slug.tsx     -> /post/:slug (dynamic segment)
\`\`\`

## Dynamic Routes

The \`$\` prefix creates a dynamic segment:

\`\`\`typescript
// src/routes/post/$slug.tsx
export const Route = createFileRoute('/post/$slug')({
  loader: ({ params }) => getPostBySlug(params.slug),
  component: PostPage,
})
\`\`\`

## Loaders

Each route can define a **loader** that fetches data before the component renders:

\`\`\`typescript
loader: ({ params }) => {
  return fetchPost(params.slug)
}
\`\`\`

Loaders run on both server (SSR) and client (navigation), ensuring data is always available when the component mounts.

### Type Safety

Route params, search params, and loader data are **fully typed** -- no runtime checks needed.`,
	},
	{
		slug: 'css-custom-properties-theming',
		title: 'CSS Custom Properties for Theming',
		content: `# CSS Custom Properties for Theming

CSS custom properties (variables) are the backbone of modern theming systems.

## The Pattern

Define variables on \`:root\` and override in \`.dark\`:

\`\`\`css
:root {
  --background: #eceff4;
  --foreground: #2e3440;
}

.dark {
  --background: #2e3440;
  --foreground: #d8dee9;
}
\`\`\`

## With Tailwind CSS v4

Tailwind v4 reads variables directly via \`@theme\`:

\`\`\`css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
}
\`\`\`

Now \`bg-background\` and \`text-foreground\` automatically adapt to the active theme.

## Advantages Over Class-Based Theming

1. **No JavaScript** -- pure CSS switching
2. **Inherited** -- children automatically get parent theme
3. **Performant** -- single class toggle, no re-renders
4. **Composable** -- nest themes within themes`,
	},
	{
		slug: 'building-a-blog-with-tanstack',
		title: 'Building a Blog from Scratch',
		content: `# Building a Blog from Scratch

This blog is built with a minimal stack: TanStack Start for the framework, D1 for storage, and Markdown for content.

## Architecture

\`\`\`
Browser <-> Cloudflare Worker <-> D1 Database
           (TanStack Start)     (SQLite)
\`\`\`

### Content Pipeline

1. Posts are stored as **Markdown** in the database
2. On request, the server fetches and returns raw Markdown
3. The client renders Markdown to HTML using \`marked\`
4. \`@tailwindcss/typography\` styles the output

## Design Decisions

- **No CMS** -- posts are seeded directly, keeping the stack simple
- **No build-time generation** -- pages are rendered on demand at the edge
- **Client-side Markdown** -- avoids HTML storage, keeps content portable
- **Pagination** -- 10 posts per page, ordered by creation date

## What Could Come Next

- RSS feed generation
- Full-text search with D1
- Post categories and tags
- Reading time estimates`,
	},
	{
		slug: 'drizzle-orm-migration-workflow',
		title: 'Database Migrations with Drizzle Kit',
		content: `# Database Migrations with Drizzle Kit

Drizzle Kit provides a schema-first migration workflow that generates SQL from your TypeScript schema definitions.

## The Workflow

### 1. Define Schema

\`\`\`typescript
export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').unique().notNull(),
  title: text('title').notNull(),
})
\`\`\`

### 2. Generate Migration

\`\`\`bash
bun run db:generate
\`\`\`

This diffs your schema against the previous state and generates a SQL migration file.

### 3. Apply Migration

Migrations can be applied:
- **Locally**: via \`wrangler d1 migrations apply\`
- **Remotely**: during deployment

## Benefits

- **Type safety** -- schema and queries share the same types
- **Incremental** -- only changed columns generate migration steps
- **Reviewable** -- generated SQL files can be code-reviewed
- **Rollback-friendly** -- each migration is a separate file`,
	},
	{
		slug: 'web-performance-edge',
		title: 'Web Performance at the Edge',
		content: `# Web Performance at the Edge

Deploying to the edge dramatically improves web performance metrics.

## Core Web Vitals Impact

### Largest Contentful Paint (LCP)
Edge SSR reduces LCP because:
- HTML is generated close to the user
- No round-trip to a distant origin server
- Streaming delivers visible content faster

### First Input Delay (FID)
Selective hydration means:
- Less JavaScript to parse
- Interactive elements respond sooner
- Non-interactive content never blocks the main thread

### Cumulative Layout Shift (CLS)
SSR eliminates layout shift from:
- Content loading states
- Font swaps (with proper font loading)
- Dynamic content insertion

## Measuring Performance

\`\`\`typescript
// Use the Performance API
const lcp = performance.getEntriesByType('largest-contentful-paint')
console.log('LCP:', lcp[lcp.length - 1]?.startTime)
\`\`\`

## Practical Tips

- Inline critical CSS
- Preload fonts with \`font-display: swap\`
- Lazy-load images below the fold
- Use \`fetchpriority="high"\` on hero images`,
	},
	{
		slug: 'typescript-strict-mode',
		title: 'Why TypeScript Strict Mode Matters',
		content: `# TypeScript Strict Mode

Strict mode enables a set of type-checking options that catch more bugs at compile time.

## What Strict Enables

\`\`\`jsonc
// tsconfig.json
{
  "compilerOptions": {
    "strict": true
    // Equivalent to enabling all of:
    // strictNullChecks
    // strictFunctionTypes
    // strictBindCallApply
    // strictPropertyInitialization
    // noImplicitAny
    // noImplicitThis
    // alwaysStrict
    // useUnknownInCatch
  }
}
\`\`\`

## Real-World Example

Without strict mode:

\`\`\`typescript
function getPost(slug: string) {
  const post = posts.find(p => p.slug === slug)
  return post.title // No error, but crashes if post is undefined!
}
\`\`\`

With strict mode:

\`\`\`typescript
function getPost(slug: string) {
  const post = posts.find(p => p.slug === slug)
  return post.title // Error: 'post' is possibly undefined
}
\`\`\`

The compiler forces you to handle the \`undefined\` case, preventing runtime crashes.

## The Tradeoff

Strict mode requires more explicit type annotations, but the investment pays off with fewer production bugs and better IDE support.`,
	},
]

export async function seedPosts() {
	const db = getDb()

	const [{ total }] = await db.select({ total: count() }).from(posts)
	if (total > 0) return

	const now = Date.now()
	const dayMs = 86_400_000

	await db.insert(posts).values(
		samplePosts.map((post, i) => ({
			...post,
			createdAt: new Date(now - (samplePosts.length - 1 - i) * dayMs),
			updatedAt: new Date(now - (samplePosts.length - 1 - i) * dayMs),
		})),
	)
}
