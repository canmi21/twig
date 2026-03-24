# AGENTS

## Communication

- Speak Chinese with the user.
- Keep technical terms in English when they are clearer, such as procedure, manifest, codegen, build, lint, and commit.
- Keep all file content concise declarative English, including code comments, docs, config, and commit messages.
- Do not use emoji.
- The user may use voice input. If a message contains nonsensical words, first try a pronunciation-based match to likely project terms. Ask for clarification if the match is not convincing.

## Decision Making

- Discuss uncertain or risky matters with the user before proceeding.
- Enter plan mode when a single request contains more than 3 distinct tasks.
- If self-review reveals improvements outside the requested scope, raise them with the user instead of silently applying them or silently deferring them.

## Toolchain

- Use Bun as the package manager for this repo.
- Prefer `bun`, `bun run`, `bunx`, `bun add`, and `bun remove` over `npm`, `npx`, or other package manager commands.
- Do not guess package versions. When adding or updating packages, use Bun to install the current requested version explicitly, usually `@latest` when the user asks for the latest.
- Respect the repository formatting and analysis toolchain: `oxfmt`, `oxlint`, `eslint`, and `knip`.
- When writing code (implementing features, fixing bugs, refactoring), `bun run knip` should only gate on unused dependencies. Do not remove or un-export functions/variables/types that knip flags as unused — they may be part of the work in progress or reserved for the next step.
- When the user asks to review or audit code, report knip's unused exports, unused variables, and dead code as findings for discussion.
- Use tmux for long-running tasks with unknown completion time, such as dev servers, watch processes, or build previews.
- The dev server tmux session is named `taki-dev`. When asked to start the dev server, first check if `taki-dev` already exists; only create a new session if it does not. The dev server runs on port 26315.

## Formatting

- Generated files should not be reformatted unless the project explicitly expects that.

## Naming

- Default to lowercase kebab-case for file names and directory names.
- Do not introduce uppercase-leading file or directory names unless a framework or generated file requires it.
- Keep in-file identifiers consistent with language conventions, such as camelCase for TypeScript variables and functions.

## Comments

- Write comments when they add value.
- Explain why, tradeoffs, or constraints, not obvious mechanics.
- During refactors, review existing comments before removing them.

## Configurability

- Do not hard-code values that users may reasonably want to customize.
- Prefer configuration, parameters, or environment variables with sensible defaults.
- If a value affects runtime behavior, deployment, networking, storage, or timeouts, assume it should be configurable unless there is a strong reason not to.

## Version Control

- Use English Conventional Commit messages such as `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `deps:`, `revert:`, and `perf:`.
- Use a scope only when it materially improves clarity.
- Do not mention plan phases in commit messages.
- Do not mention version bumps in commit messages unless the user explicitly asks for that.
- Before every `git commit`, run `bun run fmt`, `bun run lint`, and `bun run typecheck`, then fix any failures. Husky pre-commit enforces `fmt` (blocks on failure) and runs `lint:oxlint` / `lint:eslint` (blocks only on errors); the commit-msg hook validates Conventional Commit format. These hooks are the safety net — the agent should still run checks explicitly before committing.
- When routing, build config, generated files, or dependency wiring change, also run `bun run build` and `bun run knip` before commit.
- If the user provides a full execution plan and the work completes cleanly, commit directly with the required format when requested.
- If any issue, ambiguity, or suspected breaking change appears, stop and discuss with the user before committing unless the user explicitly asks otherwise.
- If any issue appears during implementation, stop and do not commit. Wait for the user to confirm the fix before committing.
- Do not push unless the user explicitly asks.

## Lint Pipeline

- Execution order: `oxfmt` → `oxlint` → `eslint`. Pre-commit hooks follow the same order.
- `oxlint` handles all general lint rules. `eslint` is minimal — only React Compiler rules and Tailwind CSS.
- `eslint-plugin-oxlint` auto-disables ESLint rules already covered by oxlint via `buildFromOxlintConfigFile`.
- `eslint-plugin-better-tailwindcss` has `enforce-consistent-line-wrapping` disabled due to irreconcilable conflict with oxfmt JSX attribute formatting.
- CLI scripts (`src/cli/`) have oxlint overrides: `no-console` and `no-await-in-loop` are allowed.

## Research Before Guessing

- When encountering unfamiliar APIs, version-specific behavior, or uncertain best practices, search the web for current documentation before attempting implementation.
- This applies especially to fast-moving ecosystems like TanStack Start, Cloudflare Workers, and Tailwind CSS where APIs change between versions.
- Do not assume API shapes from memory when the project uses specific pinned versions.

## Architecture

- This is a TanStack Start SSR app deployed to Cloudflare Workers.
- Storage: D1 (SQLite) for structured data, R2 for media files, KV for compiled content cache.
- CLI scripts in `src/cli/` use miniflare to access local D1/R2/KV, sharing the same `.wrangler/state/v3/` persistence path as `wrangler dev`.
- Database operations live in `src/lib/database/`, content domain logic in `src/lib/content/`, markdown compiler in `src/lib/compiler/`.
- Cloudflare Worker bindings are accessed via `import { env } from 'cloudflare:workers'` in server code, wrapped in `src/lib/content/env.ts`.

## Content Pipeline

- `bun run push`: validate → diff → execute. Scans `contents/posts/`, syncs to D1 + R2 + KV. Incremental: only writes changes.
- `bun run pull`: full export from D1 + R2 to `contents/posts/`. Cleans target directory first.
- `bun run rebuild`: recompile all posts from D1 and refresh KV cache. Does not touch D1 or R2.
- Markdown uses remark-directive for media: `::image{src="..." alt="..."}` instead of standard `![]()` syntax.
- Compiler output includes `components` array with placeholder comments `<!--component:N-->` in HTML, resolved at render time by `ComponentResolver`.
- Media files are content-addressed by sha256 hash. Push replaces relative paths with `{hash}.{ext}` in stored content.

## Commit Workflow

- The user often says "commit" or "commit 一下" as a standalone request after completing work. Proceed directly with staging, committing, and verifying — do not ask for confirmation.
- When the user provides a link or specific text for the commit body, include it in the extended description.
- Run `bun run fmt`, `bun run lint:oxlint`, `bun run lint:eslint`, and `bun run typecheck` before every commit. Fix errors, then commit.
- When build config, routing, or dependencies change, also run `bun run build` and `bun run knip`.
- The user prefers concise commit messages. Lead with the change type, not the implementation details.
