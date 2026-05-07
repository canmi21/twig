# Naming

## Filenames

kebab-case everywhere, including component files. SvelteKit `+`-prefixed files keep their prescribed names.

## Identifiers

- Variables and functions: `camelCase`.
- Types and interfaces: `PascalCase`.
- Constants: `UPPER_SNAKE_CASE` for true compile-time or module-level constants; `camelCase` for derived values or narrow-scope bindings.

## Objectivity

Names describe **what the thing does**, not **which vendor provides it**. A function that reports errors is `handleError`, not `handleSentry`. A script that collects page views is an analytics snippet, not an "umami block."

Vendor and brand names may only appear in **edge files** — the thin integration boundary where the project meets an external dependency:

- Import statements (unavoidable).
- Dedicated integration files (`hooks.client.ts` for error tracking, `app.html` for analytics script tags).
- Icon components whose content _is_ a brand asset (`github.svelte`, `bluesky.svelte`).
- Generated output directories managed by a library (`$lib/paraglide/`).

Internal logic, utility functions, and shared types must stay brand-free. If swapping a library would force renames across the codebase, the abstraction boundary is in the wrong place.
