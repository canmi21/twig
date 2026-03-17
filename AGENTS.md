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

## Formatting

- Respect `.editorconfig` and formatter configuration files.
- Default indentation is tabs with width 2.
- JSON, JSONC, and JSON5 use 2 spaces.
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

- Never add AI co-authorship or similar metadata.
- Use English Conventional Commit messages such as `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `deps:`, `revert:`, and `perf:`.
- Use a scope only when it materially improves clarity.
- Do not mention plan phases in commit messages.
- Do not mention version bumps in commit messages unless the user explicitly asks for that.
- Before every `git commit`, run `bun run fmt` and `bun run lint`, then fix any failures.
- When routing, build config, generated files, or dependency wiring change, also run `bun run build` and `bun run knip` before commit.
- If the user provides a full execution plan and the work completes cleanly, commit directly with the required format when requested.
- If any issue, ambiguity, or suspected breaking change appears, stop and discuss with the user before committing unless the user explicitly asks otherwise.
- If any issue appears during implementation, stop and do not commit. Wait for the user to confirm the fix before committing.
- Do not push unless the user explicitly asks.

## Database

- Migration files are append-only. Never delete or edit existing migration files.
- Migrations are incremental: any database can roll forward from any prior state to the current schema by applying pending migrations.
- Never operate on the remote database during development.
- `bun run db:gen` generates a new migration file from schema changes. Run it after modifying `schema.ts`.
- `bun run db:fresh` is the local reset workflow: clears all local D1/KV/R2 state, re-applies every migration from scratch, then seeds. Use it to get a clean, fully usable local database at the current schema.
- Local dev loop for schema changes: modify schema -> `bun run db:gen` -> `bun run db:fresh` -> verify.
- Each feature should add its own seed file in `drizzle/seed/` and register it in `drizzle/seed.ts`.
- Seed data should be realistic in length and self-descriptive of the field's purpose.
- Seed data must not contain brand-specific content. Use neutral, descriptive placeholder values.
