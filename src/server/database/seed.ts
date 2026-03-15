import { count } from 'drizzle-orm'
import { getDb } from '~/server/database/client'
import {
	baseContent,
	projectExtension,
	mediaExtension,
	links,
	guestbookEntries,
} from '~/server/database/schema'

function uuid() {
	return crypto.randomUUID()
}

function isoDate(daysAgo: number): string {
	const d = new Date()
	d.setDate(d.getDate() - daysAgo)
	return d.toISOString()
}

const seedContent = [
	// ── Posts (4) ──
	{
		id: uuid(),
		type: 'post',
		title: 'Building a Digital Alter Ego',
		slug: 'building-digital-alter-ego',
		content: `# Building a Digital Alter Ego

The internet is full of blogs, but what if your site could be more than a reverse-chronological list of articles?

## The Idea

A digital alter ego is a living document -- part blog, part bookshelf, part scrapbook. It captures not just what you *write*, but what you *think*, *build*, *read*, and *listen to*.

> "We are what we repeatedly do. Excellence, then, is not an act, but a habit." -- Aristotle

## The Stack

\`\`\`typescript
const stack = {
  framework: 'TanStack Start',
  database: 'Cloudflare D1',
  orm: 'Drizzle',
  styling: 'Tailwind CSS v4',
  hosting: 'Cloudflare Workers',
}
\`\`\`

### Why This Stack?

- **Edge-first**: everything runs close to the user
- **Type-safe**: from database schema to route params
- **Minimal**: no CMS, no build-time generation, no bloat

The result is a site that loads fast, stays simple, and grows with you.`,
		summary: 'Turning a simple blog into a multi-content personal site at the edge.',
		tags: JSON.stringify(['typescript', 'cloudflare', 'design']),
		coverImage: 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=800&h=400&fit=crop',
		isDraft: 0,
		isPinned: 1,
		metadata: '{}',
		createdAt: isoDate(1),
		updatedAt: isoDate(1),
		publishedAt: isoDate(1),
	},
	{
		id: uuid(),
		type: 'post',
		title: 'Server Functions Are the New API',
		slug: 'server-functions-new-api',
		content: `# Server Functions Are the New API

REST endpoints had a good run. GraphQL pushed the boundary. But server functions might be the simplest answer yet.

## What Changed

\`\`\`typescript
// Before: manual fetch, manual types, manual error handling
const res = await fetch('/api/posts?page=2')
const data: PostsResponse = await res.json()

// After: one function, fully typed
const data = await getPostsPaginated({ data: { page: 2 } })
\`\`\`

The compiler knows the input shape. The compiler knows the output shape. There's no serialization mismatch, no URL typos, no forgotten headers.

## When to Still Use REST

- Public APIs consumed by third parties
- Webhooks and integrations
- When you need HTTP caching semantics

For internal data fetching in a full-stack app? Server functions win.`,
		summary: 'Why type-safe server functions are replacing REST for internal data fetching.',
		tags: JSON.stringify(['typescript', 'react', 'architecture']),
		coverImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=400&fit=crop',
		isDraft: 0,
		isPinned: 0,
		metadata: '{}',
		createdAt: isoDate(5),
		updatedAt: isoDate(5),
		publishedAt: isoDate(5),
	},
	{
		id: uuid(),
		type: 'post',
		title: 'Edge Computing Changed My Mental Model',
		slug: 'edge-computing-mental-model',
		content: `# Edge Computing Changed My Mental Model

I used to think of servers as faraway machines in Virginia or Frankfurt. Edge computing flipped that.

## The Old Model

\`\`\`
User (Tokyo) -> CDN -> Origin (us-east-1) -> Database (us-east-1)
                       ~200ms round trip
\`\`\`

## The New Model

\`\`\`
User (Tokyo) -> Worker (Tokyo) -> D1 (replicated)
                ~10ms
\`\`\`

The difference isn't just latency. It changes how you think about:

1. **Caching** -- less necessary when origin is 10ms away
2. **Error budgets** -- fewer network hops, fewer failures
3. **Data locality** -- your code runs where your users are

| Metric | Traditional | Edge |
|--------|-----------|------|
| TTFB | 200-400ms | 20-50ms |
| Cold start | 1-5s | <1ms |
| Global consistency | Hard | Built-in |

> The best optimization is removing the distance between computation and user.`,
		summary: 'How deploying at the edge changes your architecture thinking.',
		tags: JSON.stringify(['cloudflare', 'architecture', 'performance']),
		coverImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=400&fit=crop',
		isDraft: 0,
		isPinned: 0,
		metadata: '{}',
		createdAt: isoDate(12),
		updatedAt: isoDate(12),
		publishedAt: isoDate(12),
	},
	{
		id: uuid(),
		type: 'post',
		title: 'The Case for Minimal CSS',
		slug: 'case-for-minimal-css',
		content: `# The Case for Minimal CSS

Every pixel of visual complexity is a decision your user has to process. Less is more.

## Design Tokens Over Decoration

Instead of reaching for gradients, shadows, and animations, start with:

- **Typography**: a clear size scale and line height
- **Spacing**: consistent padding and margin rhythm
- **Color**: a small, intentional palette

\`\`\`css
:root {
  --text-heading: oklch(0.2 0.005 90);
  --text-primary: oklch(0.35 0.01 90);
  --text-secondary: oklch(0.55 0.01 90);
  --border-default: oklch(0.88 0.005 90);
}
\`\`\`

## When to Add Complexity

Add visual weight only when it serves a purpose:

- **Borders** separate distinct content regions
- **Shadows** indicate elevation (modals, dropdowns)
- **Color accents** guide attention to interactive elements
- **Transitions** provide continuity during state changes

Everything else is noise.`,
		summary: 'Why restraint in CSS leads to better user experiences.',
		tags: JSON.stringify(['design', 'css', 'typography']),
		coverImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop',
		isDraft: 0,
		isPinned: 0,
		metadata: '{}',
		createdAt: isoDate(20),
		updatedAt: isoDate(20),
		publishedAt: isoDate(20),
	},

	// ── Projects (2) ──
	{
		id: 'proj-taki',
		type: 'project',
		title: 'taki',
		slug: 'taki',
		content: `# taki

A minimal personal site engine built on TanStack Start and Cloudflare Workers.

## Goals

- Ship a personal site that feels like *you*, not a template
- Support multiple content types: posts, notes, thoughts, media logs
- Run entirely at the edge with zero cold starts

## Architecture

The app is a single Cloudflare Worker that handles SSR, API calls, and static assets. D1 provides the database, and Drizzle ORM keeps everything type-safe.

\`\`\`
Browser <-> Worker (SSR + API) <-> D1 (SQLite)
\`\`\`

## Status

Actively developed. Current focus: timeline view and content type system.`,
		summary: 'A minimal personal site engine on TanStack Start + Cloudflare Workers.',
		tags: JSON.stringify(['typescript', 'react', 'cloudflare']),
		coverImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=400&fit=crop',
		isDraft: 0,
		isPinned: 1,
		metadata: '{}',
		createdAt: isoDate(3),
		updatedAt: isoDate(1),
		publishedAt: isoDate(3),
	},
	{
		id: 'proj-kaze',
		type: 'project',
		title: 'kaze',
		slug: 'kaze',
		content: `# kaze

A CLI tool for scaffolding edge-first web projects.

## Features

- Interactive project setup with sensible defaults
- Templates for TanStack Start, Hono, and vanilla Workers
- Built-in D1 schema generation
- Opinionated but ejectable config (oxlint, oxfmt, Tailwind)

## Usage

\`\`\`bash
bunx kaze init my-project
cd my-project
bun dev
\`\`\`

The scaffolder asks a few questions and generates a project structure with all the boilerplate pre-configured.`,
		summary: 'CLI scaffolder for edge-first web projects.',
		tags: JSON.stringify(['typescript', 'cli', 'tooling']),
		coverImage: 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=800&h=400&fit=crop',
		isDraft: 0,
		isPinned: 0,
		metadata: '{}',
		createdAt: isoDate(30),
		updatedAt: isoDate(15),
		publishedAt: isoDate(30),
	},

	// ── Thoughts (4) ──
	{
		id: uuid(),
		type: 'thought',
		title: null,
		slug: null,
		content:
			'Sometimes the best refactor is deleting the abstraction and writing the three lines of code inline.',
		summary: null,
		tags: JSON.stringify(['code']),
		coverImage: null,
		isDraft: 0,
		isPinned: 0,
		metadata: JSON.stringify({ mood: 'contemplative' }),
		createdAt: isoDate(2),
		updatedAt: isoDate(2),
		publishedAt: isoDate(2),
	},
	{
		id: uuid(),
		type: 'thought',
		title: null,
		slug: null,
		content:
			'Spent the morning watching rain hit the window. No code today. Some days are for recharging.',
		summary: null,
		tags: JSON.stringify(['life']),
		coverImage: null,
		isDraft: 0,
		isPinned: 0,
		metadata: JSON.stringify({ mood: 'calm' }),
		createdAt: isoDate(7),
		updatedAt: isoDate(7),
		publishedAt: isoDate(7),
	},
	{
		id: uuid(),
		type: 'thought',
		title: null,
		slug: null,
		content:
			"Type safety is like seatbelts. You don't notice them until the one time they save you.",
		summary: null,
		tags: JSON.stringify(['typescript']),
		coverImage: null,
		isDraft: 0,
		isPinned: 0,
		metadata: JSON.stringify({ mood: 'thoughtful' }),
		createdAt: isoDate(14),
		updatedAt: isoDate(14),
		publishedAt: isoDate(14),
	},
	{
		id: uuid(),
		type: 'thought',
		title: null,
		slug: null,
		content:
			'The best documentation is a well-named function. The second best is a comment explaining why.',
		summary: null,
		tags: JSON.stringify(['code']),
		coverImage: null,
		isDraft: 0,
		isPinned: 0,
		metadata: JSON.stringify({ mood: 'opinionated' }),
		createdAt: isoDate(25),
		updatedAt: isoDate(25),
		publishedAt: isoDate(25),
	},

	// ── Notes (3) ──
	{
		id: uuid(),
		type: 'note',
		title: 'TIL: Drizzle D1 Batch API',
		slug: 'til-drizzle-d1-batch',
		content: `Drizzle supports D1's batch API for running multiple queries in a single round trip:

\`\`\`typescript
const results = await db.batch([
  db.select().from(posts).limit(10),
  db.select({ total: count() }).from(posts),
])
\`\`\`

This is significantly faster than sequential queries because D1 can optimize the execution plan. Each query in the batch runs in the same transaction.

Worth remembering for any page that needs multiple independent queries.`,
		summary: 'Using Drizzle batch API for efficient multi-query D1 calls.',
		tags: JSON.stringify(['drizzle', 'cloudflare', 'til']),
		coverImage: null,
		isDraft: 0,
		isPinned: 0,
		metadata: '{}',
		createdAt: isoDate(4),
		updatedAt: isoDate(4),
		publishedAt: isoDate(4),
	},
	{
		id: uuid(),
		type: 'note',
		title: 'oklch Is the Future of CSS Color',
		slug: 'oklch-css-color',
		content: `Switched all my design tokens to oklch and the difference is noticeable. Colors feel more perceptually uniform -- a 0.1 lightness step looks the same regardless of hue.

The format: \`oklch(lightness chroma hue)\`

- Lightness: 0 (black) to 1 (white)
- Chroma: 0 (gray) to ~0.4 (vivid)
- Hue: 0-360 degrees

The killer feature: you can adjust lightness without shifting the perceived hue. Try that with HSL and watch your blues turn purple.`,
		summary: 'Why oklch produces more consistent color scales than HSL.',
		tags: JSON.stringify(['css', 'design', 'til']),
		coverImage: null,
		isDraft: 0,
		isPinned: 0,
		metadata: '{}',
		createdAt: isoDate(9),
		updatedAt: isoDate(9),
		publishedAt: isoDate(9),
	},
	{
		id: uuid(),
		type: 'note',
		title: 'Bun Shell Scripting',
		slug: 'bun-shell-scripting',
		content: `Bun's shell API is surprisingly nice for scripting tasks that would normally be bash:

\`\`\`typescript
import { $ } from 'bun'

const files = await $\`find src -name "*.ts" | wc -l\`.text()
console.log(\`TypeScript files: \${files.trim()}\`)
\`\`\`

Cross-platform, type-safe, and no need to escape strings. Using it for all my project scripts now.`,
		summary: "Using Bun's built-in shell API for cross-platform scripting.",
		tags: JSON.stringify(['bun', 'tooling', 'til']),
		coverImage: null,
		isDraft: 0,
		isPinned: 0,
		metadata: '{}',
		createdAt: isoDate(18),
		updatedAt: isoDate(18),
		publishedAt: isoDate(18),
	},

	// ── Snippets (2) ──
	{
		id: uuid(),
		type: 'snippet',
		title: 'Type-Safe Search Params',
		slug: null,
		content: `Validate and type search params in TanStack Router:

\`\`\`typescript
export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => ({
    page: Number(search.page) || 1,
    type: (search.type as string) || undefined,
    tag: (search.tag as string) || undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getTimeline(deps),
})
\`\`\`

The \`validateSearch\` function acts as both parser and type guard. Downstream code gets full type inference with zero runtime overhead beyond the validation itself.`,
		summary: 'Pattern for validated, typed search params in TanStack Router.',
		tags: JSON.stringify(['typescript', 'react']),
		coverImage: null,
		isDraft: 0,
		isPinned: 0,
		metadata: JSON.stringify({ language: 'typescript' }),
		createdAt: isoDate(6),
		updatedAt: isoDate(6),
		publishedAt: isoDate(6),
	},
	{
		id: uuid(),
		type: 'snippet',
		title: 'Truncate at Word Boundary',
		slug: null,
		content: `Clean text truncation that never cuts mid-word:

\`\`\`typescript
function truncateAtBoundary(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  const truncated = text.slice(0, maxLen)
  const boundary = Math.max(
    truncated.lastIndexOf('\\n'),
    truncated.lastIndexOf(' '),
  )
  return (boundary > maxLen * 0.5
    ? truncated.slice(0, boundary)
    : truncated) + '...'
}
\`\`\`

Prefers breaking at newlines, falls back to spaces. The 50% threshold prevents degenerate cases where a long word at the start would truncate too aggressively.`,
		summary: 'Word-boundary-aware text truncation in TypeScript.',
		tags: JSON.stringify(['typescript', 'utils']),
		coverImage: null,
		isDraft: 0,
		isPinned: 0,
		metadata: JSON.stringify({ language: 'typescript' }),
		createdAt: isoDate(22),
		updatedAt: isoDate(22),
		publishedAt: isoDate(22),
	},

	// ── Media (3) ──
	{
		id: 'media-book-1',
		type: 'media',
		title: 'Designing Data-Intensive Applications',
		slug: null,
		content:
			"The single best technical book I've read on distributed systems. Kleppmann covers everything from B-trees to stream processing with clarity that makes complex topics feel approachable. Every chapter changed how I think about building systems.",
		summary: "Martin Kleppmann's essential guide to distributed systems.",
		tags: JSON.stringify(['reading', 'tech']),
		coverImage: null,
		isDraft: 0,
		isPinned: 0,
		metadata: '{}',
		createdAt: isoDate(8),
		updatedAt: isoDate(8),
		publishedAt: isoDate(8),
	},
	{
		id: 'media-movie-1',
		type: 'media',
		title: 'Perfect Days',
		slug: null,
		content:
			'Wim Wenders captures the beauty of routine. A Tokyo toilet cleaner finds profound joy in trees, music, and the patterns of light. Slow, meditative, and deeply human. Left the theater wanting to simplify everything.',
		summary: "Wim Wenders' meditation on finding beauty in routine.",
		tags: JSON.stringify(['film', 'life']),
		coverImage: null,
		isDraft: 0,
		isPinned: 0,
		metadata: '{}',
		createdAt: isoDate(15),
		updatedAt: isoDate(15),
		publishedAt: isoDate(15),
	},
	{
		id: 'media-music-1',
		type: 'media',
		title: 'Blonde',
		slug: null,
		content:
			'Frank Ocean built something that doesn\'t fit any genre. Channel Orange was brilliant, but Blonde is art. "Self Control" still hits differently every listen. The kind of album where silence between tracks carries meaning.',
		summary: "Frank Ocean's genre-defying masterpiece.",
		tags: JSON.stringify(['music']),
		coverImage: null,
		isDraft: 0,
		isPinned: 0,
		metadata: '{}',
		createdAt: isoDate(35),
		updatedAt: isoDate(35),
		publishedAt: isoDate(35),
	},

	// ── Milestone (1) ──
	{
		id: uuid(),
		type: 'milestone',
		title: 'taki v0 launched',
		slug: null,
		content:
			"First version of the site is live. Timeline, projects, bookshelf, guestbook -- all running on a single Cloudflare Worker. It's rough around the edges, but it's *mine*.",
		summary: 'The first public version of this site.',
		tags: JSON.stringify(['milestone', 'taki']),
		coverImage: 'https://images.unsplash.com/photo-1504805572947-34fad45aed93?w=800&h=400&fit=crop',
		isDraft: 0,
		isPinned: 0,
		metadata: '{}',
		createdAt: isoDate(0),
		updatedAt: isoDate(0),
		publishedAt: isoDate(0),
	},

	// ── Statuses (2) ──
	{
		id: uuid(),
		type: 'status',
		title: null,
		slug: null,
		content: 'Refactoring the database schema. Again.',
		summary: null,
		tags: JSON.stringify(['code']),
		coverImage: null,
		isDraft: 0,
		isPinned: 0,
		metadata: '{}',
		createdAt: isoDate(1),
		updatedAt: isoDate(1),
		publishedAt: isoDate(1),
	},
	{
		id: uuid(),
		type: 'status',
		title: null,
		slug: null,
		content: 'Dark mode looks perfect. Light mode needs work.',
		summary: null,
		tags: JSON.stringify(['design']),
		coverImage: null,
		isDraft: 0,
		isPinned: 0,
		metadata: '{}',
		createdAt: isoDate(10),
		updatedAt: isoDate(10),
		publishedAt: isoDate(10),
	},

	// ── Repost (1) ──
	{
		id: uuid(),
		type: 'repost',
		title: 'The Grug Brained Developer',
		slug: null,
		content:
			'Essential reading for anyone who has over-engineered a system. "Complexity very, very bad." The whole thing is gold.\n\nSource: https://grugbrain.dev',
		summary: 'A satirical but wise guide to keeping software simple.',
		tags: JSON.stringify(['code', 'reading']),
		coverImage: null,
		isDraft: 0,
		isPinned: 0,
		metadata: JSON.stringify({ sourceUrl: 'https://grugbrain.dev' }),
		createdAt: isoDate(28),
		updatedAt: isoDate(28),
		publishedAt: isoDate(28),
	},
]

const seedProjectExtensions = [
	{
		id: uuid(),
		contentId: 'proj-taki',
		status: 'active',
		demoUrl: null,
		repoUrl: 'https://github.com/example/taki',
		techStack: JSON.stringify([
			'TanStack Start',
			'React',
			'Drizzle',
			'Cloudflare Workers',
			'Tailwind CSS',
		]),
		screenshots: JSON.stringify([]),
		role: 'Creator',
	},
	{
		id: uuid(),
		contentId: 'proj-kaze',
		status: 'planned',
		demoUrl: null,
		repoUrl: 'https://github.com/example/kaze',
		techStack: JSON.stringify(['TypeScript', 'Bun', 'Commander']),
		screenshots: JSON.stringify([]),
		role: 'Creator',
	},
]

const seedMediaExtensions = [
	{
		id: uuid(),
		contentId: 'media-book-1',
		mediaType: 'book',
		rating: 5,
		creator: 'Martin Kleppmann',
		cover: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=200&h=300&fit=crop',
		year: 2017,
		comment: 'Changed how I think about systems design.',
		finishedAt: isoDate(8),
	},
	{
		id: uuid(),
		contentId: 'media-movie-1',
		mediaType: 'movie',
		rating: 5,
		creator: 'Wim Wenders',
		cover: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&h=300&fit=crop',
		year: 2023,
		comment: 'A quiet masterpiece about finding beauty in the everyday.',
		finishedAt: isoDate(15),
	},
	{
		id: uuid(),
		contentId: 'media-music-1',
		mediaType: 'music',
		rating: 5,
		creator: 'Frank Ocean',
		cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=300&fit=crop',
		year: 2016,
		comment: 'The kind of album that rewards every re-listen.',
		finishedAt: isoDate(35),
	},
]

const seedLinks = [
	{
		id: uuid(),
		name: 'TanStack',
		url: 'https://tanstack.com',
		avatar: null,
		description: 'High-quality, type-safe libraries for React.',
		category: 'tools',
		createdAt: isoDate(30),
	},
	{
		id: uuid(),
		name: 'Cloudflare Workers Docs',
		url: 'https://developers.cloudflare.com/workers/',
		avatar: null,
		description: 'Official documentation for Cloudflare Workers platform.',
		category: 'tools',
		createdAt: isoDate(30),
	},
	{
		id: uuid(),
		name: 'Drizzle ORM',
		url: 'https://orm.drizzle.team',
		avatar: null,
		description: 'TypeScript ORM that feels like writing SQL.',
		category: 'tools',
		createdAt: isoDate(30),
	},
	{
		id: uuid(),
		name: 'Overreacted',
		url: 'https://overreacted.io',
		avatar: null,
		description: "Dan Abramov's personal blog on React and programming.",
		category: 'blogs',
		createdAt: isoDate(30),
	},
	{
		id: uuid(),
		name: 'Josh W Comeau',
		url: 'https://www.joshwcomeau.com',
		avatar: null,
		description: 'Interactive articles on CSS, React, and web dev.',
		category: 'blogs',
		createdAt: isoDate(30),
	},
]

const seedGuestbook = [
	{
		id: uuid(),
		nickname: 'wanderer',
		avatar: null,
		content: 'Clean design. Love the copper accent color.',
		website: null,
		createdAt: isoDate(2),
	},
	{
		id: uuid(),
		nickname: 'dev_hiro',
		avatar: null,
		content: 'TanStack Start + D1 is such a good combo. Bookmarked this for reference.',
		website: 'https://hiro.dev',
		createdAt: isoDate(5),
	},
	{
		id: uuid(),
		nickname: 'moonlight',
		avatar: null,
		content: 'The dark mode transition is smooth. How did you do the wipe effect?',
		website: null,
		createdAt: isoDate(8),
	},
	{
		id: uuid(),
		nickname: 'sakura',
		avatar: null,
		content: 'Found this through the grugbrain repost. Staying for the vibes.',
		website: 'https://sakura.page',
		createdAt: isoDate(12),
	},
]

export async function seedDatabase() {
	const db = getDb()

	const [{ total }] = await db.select({ total: count() }).from(baseContent)
	if (total > 0) return

	// D1 limits bound parameters per query; batch inserts to stay under the limit
	const batchSize = 5
	for (let i = 0; i < seedContent.length; i += batchSize) {
		await db.insert(baseContent).values(seedContent.slice(i, i + batchSize))
	}
	await db.insert(projectExtension).values(seedProjectExtensions)
	await db.insert(mediaExtension).values(seedMediaExtensions)
	await db.insert(links).values(seedLinks)
	await db.insert(guestbookEntries).values(seedGuestbook)
}
