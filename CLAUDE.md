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
- **Filenames:** kebab-case, including component files. SvelteKit `+`-prefixed files keep their prescribed names.
- When the user says "commit this" without a message, write one that passes commitlint.

## Git

Remote `origin` → `github.com/canmi21/taki`. Working branch: **`twig`** (not `main` — taken by another project on the same remote). No force-push without explicit instruction.

## Spec index

Each file below is the authoritative source for its topic. Edit there, not here.

- [spec/styling.md](spec/styling.md) — color tokens, icons
- [spec/components.md](spec/components.md) — Bits UI, accessibility
- [spec/i18n.md](spec/i18n.md) — Paraglide, locale roles, translation rules
- [spec/build.md](spec/build.md) — build-time constants, Vite `define`

## Keeping the spec honest

When the toolchain or a project-wide design convention changes, update this file **and** the relevant `spec/*.md` in the **same commit** as the tooling / code change. A rule that contradicts the running code is worse than no rule.

Keep each file tight. If a section starts accumulating step-by-step instructions, war stories, or "don't forget to…" reminders, that is a signal to mechanize it — add a lefthook job, an ESLint rule, or a `svelte-check` warning — and delete the prose. Only project-scope, evergreen rules belong here; everything else either becomes code or gets deleted.
