# Build-time constants

Values that are fixed per deployment go through Vite `define` in `vite.config.ts`, not through `platform.env` — no reason to pay a runtime lookup for something that was known at build. Each constant is declared ambiently in `src/app.d.ts` so it types as a plain global.

| Constant             | Resolved from (priority)                     | Fallback       |
| -------------------- | -------------------------------------------- | -------------- |
| `__APP_GIT_COMMIT__` | `VITE_GIT_COMMIT` env → `git rev-parse HEAD` | `'dev'`        |
| `__PUBLIC_URL__`     | `PUBLIC_URL` env                             | hard-coded URL |
| `__SERVER_ROUTES__`  | Walk `src/routes/**/+server.{ts,js}`         | `[]`           |

- Use the constant directly in `.svelte` / `.ts` files — no import needed.
- `'dev'` is the commit sentinel: link to repo root, not `/commit/dev`.
- Override at build/deploy: `PUBLIC_URL=https://preview.example.com bun run build`.
- `__SERVER_ROUTES__` is consumed by `hooks.server.ts` to skip locale negotiation for `+server.ts` endpoints. Adding a new endpoint is automatically picked up at next build — no manual list.
- Adding a new constant = write a `resolveX()` in `vite.config.ts`, add to `define`, add one line to the `declare global` block in `src/app.d.ts`.
