# CLAUDE.md

Project: twig — SvelteKit app targeting Cloudflare Workers (Workers + Static Assets).

## Stack

- **Runtime (dev/build):** Node >= 25
- **Runtime (prod):** Cloudflare Workers (via `@sveltejs/adapter-cloudflare`, `cfTarget: workers`)
- **Package manager:** Bun (only — not used as runtime). `bunfig.toml` sets `[install] cache = false`.
- **Framework:** SvelteKit + TypeScript (strict)
- **Local Workers emulator:** `wrangler dev` (bundles miniflare/workerd)
- **Dead-code / unused-deps:** Knip
- **Formatter:** Prettier (+ `prettier-plugin-svelte`, `prettier-plugin-tailwindcss`)
- **Linter:** ESLint flat config (+ `typescript-eslint`, `eslint-plugin-svelte`, `eslint-config-prettier`)
- **Git hooks:** Husky + commitlint (`commit-msg` only)

## Commands

| Command           | Purpose                                              |
| ----------------- | ---------------------------------------------------- |
| `bun run dev`     | Vite dev server on `http://localhost:23315` (strict) |
| `bun run build`   | `wrangler types --check` + `vite build`              |
| `bun run preview` | `wrangler dev` against built worker on port 4173     |
| `bun run gen`     | Regenerate `worker-configuration.d.ts` from wrangler |
| `bun run check`   | Types + svelte-check                                 |
| `bun run knip`    | Report unused files / exports / dependencies         |
| `bun run format`  | Prettier write (formats in place — no `--check`)     |
| `bun run lint`    | Prettier check + ESLint                              |

Do **not** use `npm`, `pnpm`, `yarn`, or `bun` as a script runtime. Bun is the installer; all scripts execute under Node via shebang.

## Communication & writing conventions

- **Chat with the user:** Simplified Chinese.
- **All file content (code, identifiers, comments, commit messages, docs inside the repo):** English.

## Comment policy

Default to **no comments**. Only write a comment when at least one of these is true:

1. The behavior is non-obvious from well-named identifiers.
2. A specific decision was made for a reason that is not visible in the code (trade-off, constraint, workaround for an upstream bug).
3. A known issue / TODO links to an external reference (issue URL, RFC, spec section).

Never explain _what_ the code does when the name already says it. Never reference the current task / PR / caller ("used by X", "added for Y") — that rots.

Keep each comment to one short line when possible. No multi-paragraph docstrings.

## Commit policy

**Before every commit, run `bun run format`.** Always the write variant — do not run `prettier --check` or `bun run lint` as a gate, just let Prettier rewrite files in place and include the result in the commit. This keeps diffs clean and avoids commit-hook friction.

Every commit **must** follow [Conventional Commits](https://www.conventionalcommits.org/).

Enforced by `commitlint` via the `commit-msg` husky hook. Rules (see `commitlint.config.js`):

- `extends: @commitlint/config-conventional`
- `header-max-length`: **72**
- `subject-case`: **lower-case** (the text after `type(scope):` must start lowercase)

Examples:

- `feat: add session cookie adapter`
- `fix(router): handle trailing slash on workers`
- `chore: bump wrangler to 4.82`

When the user says "commit this" without supplying a message, Claude writes the message following the rules above.

### AI co-authorship

Follow the rule in `~/.claude/CLAUDE.md`:

- Add `Co-Authored-By: Claude {Opus|Sonnet|Haiku}-{VERSION} <noreply@anthropic.com>` **only** when the assistant materially contributed original code or design beyond direct instructions.
- Do not add co-authorship for mechanical changes, one-shot user instructions, or simple commits.

## Styling & color tokens

- Tailwind v4 is wired via `@tailwindcss/vite` — no `tailwind.config.js`, no PostCSS.
- All stylesheets live in `src/styles/`.
- Global stylesheet entry: `src/styles/app.css`. It imports `tailwindcss`, then `./tokens.css`, declares the `dark` custom variant, and sets base `html` background/foreground. It is imported once from `src/routes/+layout.svelte`.
- **All colors live in `src/styles/tokens.css`** as two layers:
  - **Physical layer:** Tailwind's built-in palette (`var(--color-white)`, `var(--color-neutral-900)`, etc.). These are OKLCH and must not be touched.
  - **Semantic layer:** project-owned tokens (`--color-background`, `--color-foreground`, `--color-border`, `--color-muted`, …). Light values go in `@theme`, dark overrides go in `.dark`.
- **Hard rule:** project code (`.svelte`, `.ts`, `.css`) must **only** use the semantic layer (`bg-background`, `text-foreground`, `border-border`, `hover:bg-muted`, …). Never reach through to a raw Tailwind color utility (`bg-neutral-900`, `text-white`) and never hard-code hex values. If a needed semantic does not exist yet, add it to `src/styles/tokens.css` first.
- Because `@theme` emits CSS variables at runtime, redefining a token inside `.dark` automatically flips every utility that references it — you should **not** need `dark:` prefixes on semantic utilities.

## Project layout notes

- `src/routes/` — SvelteKit routes (file-based).
- `src/lib/` — shared modules, import via `$lib/...`.
- `src/app.d.ts` — ambient types; extend `App.Platform` here to type CF bindings.
- `worker-configuration.d.ts` — generated by `wrangler types`; do **not** edit by hand. Regenerate with `bun run gen` after changing `wrangler.jsonc`.
- `wrangler.jsonc` — single source of truth for Workers config. `compatibility_flags` currently: `nodejs_als`. Add `nodejs_compat` only if you actually import a Node built-in.
- `.svelte-kit/cloudflare/_worker.js` — build output consumed by `wrangler dev` / `wrangler deploy`. Never committed.

## Git

- Remote `origin` → `https://github.com/canmi21/taki.git`
- Working branch: **`twig`** (not `main` — `main` is used by a different project on this remote).
- Never force-push `twig` without explicit instruction.

## What not to do

- Do not add backwards-compatibility shims for code that was just removed.
- Do not add feature flags for hypothetical future requirements.
- Do not add error handling / validation for conditions that cannot occur at a trusted internal boundary.
- Do not introduce a second package manager or a second runtime.
- Do not edit generated files (`.svelte-kit/`, `worker-configuration.d.ts`, `build/`).
