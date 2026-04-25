# CLAUDE.md

twig — SvelteKit app on Cloudflare Workers. This file is the orchestration index. Domain rules live in `spec/*.md` — see the [spec index](#spec-index) below.

## Stack

Node 25 (dev/build) → CF Workers prod via `@sveltejs/adapter-cloudflare`. Bun is installer only, never runtime. Dev server on `http://localhost:23315`.

## Quality gates

Everything that can be mechanical is mechanical — treat the gate as authoritative, don't re-check by hand.

| Gate                  | Runs                                                                                   | When               |
| --------------------- | -------------------------------------------------------------------------------------- | ------------------ |
| Lefthook `pre-commit` | Prettier `--write` + ESLint `--fix` on staged files + `tsc --noEmit` on the whole proj | Every commit, auto |
| Lefthook `commit-msg` | commitlint (Conventional Commits per `commitlint.config.js`)                           | Every commit, auto |
| `just typecheck`      | `tsc --noEmit` (fast, ~1s, TS files only)                                              | On demand          |
| `just check`          | `wrangler types` → `svelte-kit sync` → `svelte-check` (types + a11y warnings)          | On demand (slow)   |
| `bun run build`       | `wrangler types --check` → `vite build`                                                | Pre-release / CI   |

`just check` is the authoritative type + a11y gate and the only place Svelte 5's `a11y_*` compiler warnings surface — **zero tolerance** for any of them. Run before a release or PR push; too slow for pre-commit.

## Conventions

- **Chat:** Simplified Chinese. **Code / commits / docs-in-repo:** English.
- When the user says "commit this" without a message, write one that passes commitlint.

## Git

Remote `origin` → `github.com/canmi21/taki`. Working branch: **`twig`** (not `main` — taken by another project on the same remote). No force-push without explicit instruction.

## Domain rules

Each line is the load-bearing rule from its spec — enough to avoid the common trap, not enough to act on. Read the linked file before relying on details.

**Code & process**

- **Naming** — kebab-case files; brand-neutral identifiers (`handleError`, never `handleSentry`). See [spec/naming.md](spec/naming.md).
- **Comments** — Why, not what. ≤3 lines (lefthook warns), no `// ===` separators, every `svelte-ignore a11y_*` needs a justifying note. See [spec/comments.md](spec/comments.md).
- **Testing** — Vitest. Bug fixes follow red-green: failing test first, then fix, commit together. Orchestrators test orchestration only — don't re-verify subordinate logic. See [spec/testing.md](spec/testing.md).

**Visual**

- **Color** — Three-layer tokens (Tailwind built-ins → `palette.css` hex → semantic `tokens.css`). Code uses semantic only — never raw `bg-neutral-*` or hex (brand colors excepted). Theme swap goes through `applyTheme()`, never `classList.toggle('dark')`. See [spec/styling.md](spec/styling.md).
- **Typography** — Font slots are `--font-latin` / `--font-code` / `--font-emoji`, NOT `--font-sans` / `--font-mono` (Tailwind v4 reserves the latter and breaks the fallback chain). External CDN versions pinned to patch — no `@latest`, no floating minor. See [spec/typography.md](spec/typography.md).
- **Icons** — Four sources only: custom SVG, Lucide (per-icon import), FontAwesome (`svelte-fa`), Iconify (`unplugin-icons` + `~icons/<set>/<name>`). See [spec/icons.md](spec/icons.md).

**UI**

- **Components** — All interactive primitives via `bits-ui` — never hand-roll dropdowns, dialogs, popovers, tooltips, click-outside, or arrow-key nav. Zero tolerance for `a11y_*` compiler warnings. Every `aria-label` goes through Paraglide. See [spec/components.md](spec/components.md).
- **Motion** — Three tiers in localStorage (`full | reduce | none`). `none` is a global CSS kill switch (Svelte JS transitions also need `duration: 0`); `reduce` is per-component — each component decides what counts as "spatial". See [spec/motion.md](spec/motion.md).
- **Notifications** — One global store (`notifications.push`). **No inline error UI in tight layouts** (footer rows, toolbar chips, inline editors) — push a toast to avoid layout shift. See [spec/notifications.md](spec/notifications.md).
- **i18n** — 5 locales (`mw` is the design reference + `baseLocale`). Every new key lands in all 5 locale files in the same commit. Bracket access only: `m['a.b.c']()`, never `m.a.b.c`. See [spec/i18n.md](spec/i18n.md).

**Build & dev**

- **Build constants** — `__APP_GIT_COMMIT__` / `__PUBLIC_URL__` / `__SERVER_ROUTES__` / `__FONTAWESOME_VERSION__` are Vite-`define`d ambient globals. Use directly — no import. See [spec/build.md](spec/build.md).
- **Dev routes** — `/dev/*` is dev-server only (404 in prod via runtime gate). Strings inside dev pages are i18n-exempt; components imported by dev pages still follow `spec/i18n.md`. See [spec/dev-routes.md](spec/dev-routes.md).

## Keeping the spec honest

When the toolchain or a project-wide design convention changes, update this file **and** the relevant `spec/*.md` in the **same commit** as the tooling / code change. A rule that contradicts the running code is worse than no rule.

Keep each file tight. If a section starts accumulating step-by-step instructions, war stories, or "don't forget to…" reminders, that is a signal to mechanize it — add a lefthook job, an ESLint rule, or a `svelte-check` warning — and delete the prose. Only project-scope, evergreen rules belong here; everything else either becomes code or gets deleted.
