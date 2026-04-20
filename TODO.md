# TODO

Tracked items that are in-flight or blocked on upcoming work. Items here are temporarily exempt from test coverage — they will change soon.

## Content core: editor + public render

The two modules blocking relaunch. Auth UI, comments, admin dashboard beyond the editor, custom block components (link-card / video / cargo / tokei), and image upload all come **after** these land. Phases are gates for decisions, not file-level steps — details marked _decide at execution_ are deliberately deferred and must not be resolved in advance.

### Architectural invariants (settled — do not re-open mid-build)

- Content is stored as **structured JSON**, not markdown, not HTML. Markdown never participates in the core data path. An optional `Export as Markdown` button may exist later as a one-way view; that is not storage.
- Editor is **Tiptap** via `@tiptap/core` + `@tiptap/pm` plus a hand-written ~50-line Svelte wrapper. No `@tiptap/svelte`, no Milkdown.
- A **single TypeScript schema module** is the source of truth for node/mark shapes, consumed by: the Tiptap configuration, the save-time validator, the renderer, and the migration framework.
- Content migrations live under `src/lib/content/migrations/` as pure `(doc) => doc` functions, numbered like Drizzle migrations, gated by a `CURRENT_SCHEMA_VERSION` constant. Run lazily on read (with write-back) and eagerly via a batch script on deploy.
- **Render happens at write time.** Save → validate → compile to HTML + plain text + TOC → store in KV. Read path is a KV lookup with a D1+recompile fallback on miss.
- Backend routes (`/@/**`) are gated by **Cloudflare Access** at the platform level. No Worker-side auth code for this slice.
- **v1 content coverage is deliberately tiny**: paragraph, heading, bold, italic, strike, underline, inline link, inline code. No block-level custom components. No images beyond URL paste. Anything richer is a separate post-launch phase.

### Phase E1 — content schema foundation

Outcome: the shape of a post in storage is fully defined and validated, independently of any UI.

#### Deliverables

- D1 `posts` table (Drizzle)
- TS types for every v1 node and mark, colocated with the schema module
- Runtime validator that accepts or rejects a raw JSON doc against the v1 schema
- Migration framework skeleton with `CURRENT_SCHEMA_VERSION = 1` and a passthrough `runMigrations`
- `CACHE` KV binding declared in `wrangler.jsonc`
- Safe-domain list module for link rendering (data only — render-side consumption lands in R1)

#### D1 `posts` table

Location: `src/lib/db/schema/posts.ts`

```
id             TEXT    PRIMARY KEY      -- ULID, normalized to lowercase on insert
slug           TEXT    UNIQUE NOT NULL
title          TEXT    NOT NULL
description    TEXT                     -- author-provided; SEO / feed use; nullable
content_json   TEXT    NOT NULL         -- stringified Tiptap JSON
schema_version INTEGER NOT NULL DEFAULT 1
created_at     INTEGER NOT NULL         -- unix ms
updated_at     INTEGER NOT NULL
published_at   INTEGER                  -- null = draft, non-null = publish time
```

No `excerpt`, `cover_image`, `category`, or `tags` columns in v1 — each is added later only if it earns its keep. Excerpts come from the compiled plain-text artifact, sliced at render time.

`schema_version` is a dedicated column, not embedded in `content_json`, so batch migration scripts can filter candidates via SQL without deserializing every row.

#### Content schema v1

Location: `src/lib/content/schema/v1.ts`

ProseMirror-native JSON shape (Tiptap emits this directly, no adapter layer):

```ts
type DocV1 = { type: 'doc'; content: BlockV1[] };

type BlockV1 =
	| { type: 'paragraph'; content?: InlineV1[] }
	| { type: 'heading'; attrs: { level: 2 | 3 }; content?: InlineV1[] };

type InlineV1 = { type: 'text'; text: string; marks?: MarkV1[] };

type MarkV1 =
	| { type: 'bold' }
	| { type: 'italic' }
	| { type: 'strike' }
	| { type: 'underline' }
	| { type: 'code' }
	| { type: 'link'; attrs: { href: string } };
```

- h1 is reserved for the post title (rendered from the `title` column). Body headings are h2 / h3 only.
- Link `attrs` carries only `href`. No author-settable `title`, `target`, or `rel`.

#### Link target / rel inference

Location: `src/lib/content/render/safe-domains.ts`

A string array of trusted hostnames, burned in at Vite build time via `define` (see `spec/build.md`). v1 contents: the site's own production domain only. Additions are a deploy-time change — there is no runtime admin UI for this list.

Render rule (lands in R1, declared here for completeness):

- `href` hostname is in the safe-domain list → `<a href="...">`, same-window navigation
- otherwise → `<a href="..." target="_blank" rel="noopener noreferrer">`

Removes the class of "author forgot `rel=noopener`" bugs by construction.

#### Validator

Library: **zod**. Location: `src/lib/content/schema/v1.ts` (colocated with the types).

Exported surface: `validateDoc(raw: unknown): DocV1` — returns the typed doc on success, throws on failure. Called at save time in E3 and on KV-miss recompile in R1.

#### Migration framework

Location: `src/lib/content/migrations/index.ts`

```ts
export type Migration = {
	from: number;
	to: number;
	up: (doc: unknown) => unknown;
};

const migrations: Migration[] = []; // E1: intentionally empty

export function runMigrations(
	doc: unknown,
	fromVersion: number
): {
	doc: unknown;
	version: number;
} {
	let current = doc;
	let version = fromVersion;
	for (const m of migrations) {
		if (m.from === version) {
			current = m.up(current);
			version = m.to;
		}
	}
	return { doc: current, version };
}

export const CURRENT_SCHEMA_VERSION = 1;
```

Contract: pure, no I/O. Caller owns write-back to D1 and cache invalidation in `CACHE`. Sibling files `001-*.ts`, `002-*.ts` land only when real schema changes happen.

#### `CACHE` KV binding

`wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  { "binding": "CACHE", "id": "<id from: wrangler kv namespace create twig-cache>" }
]
```

Binding name in code is `CACHE`; dashboard-facing namespace name is `twig-cache` (or similar project-scoped name) to avoid cross-worker ambiguity. Preview namespace is created separately and listed under `preview_id`.

Philosophy: `CACHE` is fully disposable. Every value must be reconstructable from D1 or an upstream source. Key convention across all future users of this binding: `<domain>:<kind>:<key>`, e.g. `post:rendered:{id}`, `post:index:latest`, `github:repo:{owner}:{name}`. The exact key shape for post renders is finalized in E3; E1 only reserves the namespace and the convention.

#### Acceptance criteria

- `posts` table created locally via `wrangler d1 migrations apply` against the dev binding
- `src/lib/content/schema/` and `src/lib/content/migrations/` exist with the files above
- `src/lib/content/render/safe-domains.ts` exports a `SAFE_DOMAINS: readonly string[]` populated via build-time `define`
- Validator rejects: missing required fields, unknown node / mark types, wrong heading levels, marks on non-text nodes, link without `href`
- Validator accepts: a minimal canonical v1 doc exercising at least one paragraph, one h2, and every mark type
- `runMigrations(doc, 1)` is a passthrough returning `{ doc, version: 1 }`
- `CACHE` binding resolvable in dev: `wrangler kv key put --binding CACHE test:ping pong` round-trips
- No UI, no routes, no Tiptap packages installed yet

#### Out of scope for E1

- Editor UI (E2)
- Save endpoint, compile pipeline, KV writes (E3)
- Cloudflare Access configuration (E4)
- Any real migration files under `migrations/` beyond the framework
- The actual link-target render logic (declared here, implemented in R1)

### Phase E2 — editor mount at `/@/editor/`

Outcome: a Tiptap instance renders on the route, respects the E1 schema, and emits well-formed JSON.

- Thin Svelte wrapper: mount, destroy, transaction subscription, content get/set
- Tiptap config reads node/mark definitions from the same E1 schema module
- Route structure: list + new + edit (exact URL shape for the edit page — slug vs numeric id vs ULID — decide at execution)
- Pasting unsupported content is silently normalized by ProseMirror schema, never stored raw

Decide at execution: toolbar placement and styling, keyboard shortcut set, focus / blur behavior, empty-state UX, draft autosave cadence (or none), where the slug is authored (auto from title vs explicit field).

### Phase E3 — save + compile + KV write

Outcome: Save persists canonical JSON to D1 and rendered artifacts to KV.

- Save endpoint: raw JSON in → E1 validator → D1 upsert
- Compile: JSON → HTML, JSON → plain text, JSON → TOC
- Write order: D1 first (source of truth), KV second (derivative). KV-write failure is recoverable by the read-path fallback, so no cross-store transaction is needed.
- Every save stamps `schema_version = CURRENT_SCHEMA_VERSION`

Decide at execution: HTML compiler implementation (pure string walker vs SSR of a Svelte component — lean toward string walker for testability), shiki integration point (here vs R2 — see R2), plain-text extraction rules, KV payload shape, whether publish vs save-draft are one endpoint or two.

### Phase E4 — Cloudflare Access gate

Outcome: unauthenticated traffic to `/@/**` is intercepted by CF Access before reaching the Worker.

- CF Access policy configured in the dashboard against the production and preview worker routes
- Email allowlist: author only
- Local dev keeps the existing auth overlay; Access only gates deployed traffic

Decide at execution: session duration, login page theming, whether save API endpoints get their own stricter policy or piggyback on the page policy.

### Phase R1 — public render path

Outcome: the public article route serves compiled HTML directly from KV, matching twig's visual standard.

- Route handler loads the compiled payload from KV and returns SSR HTML
- KV miss fallback: load JSON from D1, run `runMigrations`, compile, write back to KV, serve
- 404 on missing or unpublished posts
- Meta tags (title, description, canonical, OG basics) from the post row
- Conforms to project spec: palette tokens, motion tiers, a11y zero-tolerance, notification channel for errors (no inline error UI)

Decide at execution: final public URL shape (`/posts/{slug}`, `/p/{slug}`, `/{year}/{slug}`, etc.), draft preview mechanism, TOC presentation on desktop vs mobile, scroll-spy inclusion, heading level range allowed in v1.

### Phase R2 — ecosystem glue at render time

Outcome: code highlighting and article-page chrome match the rest of the site.

- Shiki integration (compile-time in E3 or render-time in R1 — decide where, then stick to it)
- Heading anchor ids and auto-generated TOC data
- External-link handling (target, rel, aria semantics)

Decide at execution: shiki theme strategy against the palette layer (single theme CSS-swapped vs dual compile), anchor slugification rules, whether external-link behavior is a mark attribute or inferred from href.

### Explicitly out of scope for this slice

- Public login / signup UI (CF Access covers the author; readers remain anonymous)
- Comments, reactions, read counts, presence, geo map
- Image upload to R2 — URL paste only in v1
- Custom block components (link-card, video, audio, tokei, cargo, github-card) — their own phase post-launch
- Admin dashboard beyond the editor list and edit pages
- Migration of historical taki posts — manual, not part of this plan

## Feed & Sitemap timestamps

`src/routes/feed/+server.ts` rounds `updated` to the current hour as a placeholder.
`src/routes/sitemap.xml/+server.ts` has no `<lastmod>` at all.

Once articles land, both must switch to per-route last-modified times derived from content metadata. Until then the current stubs are intentional — no point testing throwaway logic.
