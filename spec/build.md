# Build-time constants

Values that are fixed per deployment go through Vite `define` in `vite.config.ts`, not through `platform.env` — no reason to pay a runtime lookup for something that was known at build. Each constant is declared ambiently in `src/app.d.ts` so it types as a plain global.

| Constant             | Resolved from (priority)                     | Fallback       |
| -------------------- | -------------------------------------------- | -------------- |
| `__APP_GIT_COMMIT__` | `VITE_GIT_COMMIT` env → `git rev-parse HEAD` | `'dev'`        |
| `__PUBLIC_URL__`     | `PUBLIC_URL` env                             | hard-coded URL |

- Use the constant directly in `.svelte` / `.ts` files — no import needed.
- `'dev'` is the commit sentinel: link to repo root, not `/commit/dev`.
- Override at build/deploy: `PUBLIC_URL=https://preview.example.com bun run build`.
- Adding a new constant = write a `resolveX()` in `vite.config.ts`, add to `define`, add one line to the `declare global` block in `src/app.d.ts`.
