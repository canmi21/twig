# CLAUDE.md

twig — SvelteKit app on Cloudflare Workers.

## Stack

Node 25 (dev/build) → CF Workers prod via `@sveltejs/adapter-cloudflare`. Bun is installer only, never runtime. Dev server on `http://localhost:23315`. Prettier + ESLint (+ `eslint-plugin-better-tailwindcss`). Husky `commit-msg` hook with commitlint.

## Conventions

- **Chat:** Simplified Chinese. **Code / commits / docs-in-repo:** English.
- **Filenames:** kebab-case, including component files. SvelteKit `+`-prefixed files keep their prescribed names.

## Commit workflow

Reflex rules (no debate — just do it):

1. **Before every commit:** `bun run fmt` (Prettier write-in-place; never `--check`).
2. **If `better-tailwindcss/enforce-canonical-classes` warns:** `bunx eslint . --fix` (autofix rewrites `size-[0.8125rem]` → `size-3.25` etc. — always behavior-preserving).

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/); exact rules live in `commitlint.config.js` and are enforced by the husky hook. When the user says "commit this" without a message, write one that passes.

## Color tokens

All colors live in `src/styles/tokens.css` as two layers:

- **Physical:** Tailwind v4 built-ins (`var(--color-neutral-300)`, `var(--color-red-400)`, …). OKLCH canonical scale, untouchable.
- **Semantic:** project tokens whose values are `var()` refs into the physical layer — never raw hex (brand colors excepted). Light in `@theme`, dark overrides in `.dark`. Omit the dark override when the light value works across modes.

| Token              | Light       | Dark        | Use for                                          |
| ------------------ | ----------- | ----------- | ------------------------------------------------ |
| `background`       | white       | neutral-900 | Page surface                                     |
| `foreground`       | neutral-900 | neutral-300 | Default body text                                |
| `muted`            | neutral-50  | neutral-800 | Elevated / tinted surface (hover, raised, inset) |
| `muted-foreground` | neutral-500 | neutral-500 | Secondary text                                   |
| `border`           | neutral-200 | neutral-700 | Outlines that must read (buttons, inputs)        |
| `divider`          | neutral-100 | neutral-800 | Soft visual separators (nav, footer, sections)   |
| `success`          | `#7ac8a7`   | same        | Positive status                                  |
| `destructive`      | red-700     | red-400     | Errors                                           |

**Hard rule:** project code uses semantic tokens only (`bg-background`, `text-muted-foreground`, `border-border`, …). No raw `bg-neutral-900`, no hex. New semantics go in `tokens.css` pointing at a physical `var(--color-*)`. For one-off intermediate dimming use opacity modifiers (`text-foreground/72`) — don't add a token per level.

`@theme` emits CSS vars at runtime, so redefining inside `.dark` auto-flips all utilities — **no `dark:` prefixes needed on semantic utilities**.

## Icons

Custom SVGs → `src/lib/icons/*.svelte`, one per file, `class` prop + `fill="currentColor"` + `<title>`, no hard-coded size.

Third-party sets:

- **Lucide:** `@lucide/svelte` (per-icon: `@lucide/svelte/icons/<kebab-name>`).
- **FontAwesome:** `svelte-fa` + `@fortawesome/free-solid-svg-icons`.
- **Mingcute (or any Iconify collection):** `unplugin-icons` + `@iconify-json/<collection>`, import as `~icons/<collection>/<icon-name>`.

## Build-time constants

`__APP_GIT_COMMIT__` — resolved in `vite.config.ts` (priority: `VITE_GIT_COMMIT` env → `git rev-parse HEAD` → `'dev'`), injected via Vite `define`, typed ambiently in `src/app.d.ts`. Treat `'dev'` as a sentinel (link to repo root, not `/commit/dev`). Add more build-time constants the same way.

## Git

Remote `origin` → `github.com/canmi21/taki`. Working branch: **`twig`** (not `main` — taken by another project on the same remote). No force-push without explicit instruction.
