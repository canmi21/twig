## Database

Cloudflare D1 (SQLite at the edge), accessed via Drizzle ORM. One binding, one database per environment.

| Concern        | Where                                               |
| -------------- | --------------------------------------------------- |
| Binding name   | `DATABASE` (in `wrangler.jsonc` and `platform.env`) |
| Database name  | `twig-sql`                                          |
| Schema         | `src/lib/server/database/schema.ts`                 |
| Client factory | `src/lib/server/database/client.ts` (`getDatabase`) |
| Re-export hub  | `src/lib/server/database/index.ts`                  |
| Migrations     | `database/migrations/` (managed by drizzle-kit)     |
| Drizzle config | `drizzle.config.ts` (project root)                  |

## Naming

The full word `database` is used throughout — no `db` shorthand in identifiers, paths, or recipe names. The all-caps binding `DATABASE` matches both the wrangler convention (`ASSETS`) and the project's "spell it out" rule.

## Where the client lives

Always under `src/lib/server/` so SvelteKit's bundler refuses to ship it to the browser. Never construct the Drizzle client at module top level — the D1 binding only exists once a request is in flight, so a top-level `drizzle(env.DATABASE, ...)` would crash on cold start. Build the client inside the request scope:

```ts
import { getDatabase } from '$lib/server/database';

export async function load({ platform }) {
	const database = getDatabase(platform!.env);
	// ...
}
```

## Migrations

Day-1 workflow, committed to the repo:

```
just database-generate           # diff schema.ts → write SQL into database/migrations/
just database-migrate-local      # apply pending migrations to miniflare
just database-migrate-remote     # apply pending migrations to prod D1
just database-reset-local        # nuke local D1 and re-apply (early-dev re-baseline)
```

Drizzle-kit and wrangler share the migration directory format (`_journal.json` + numbered `.sql` files). No bridge script.

## Local vs remote

`wrangler dev` and `wrangler d1 migrations apply --local` both target miniflare's local SQLite under `.wrangler/state/v3/d1/`. No extra config needed. `vite dev` does **not** auto-wire the D1 binding — use `just preview` (which runs the built worker through wrangler) when exercising database code.

## Releasing

1. `wrangler d1 create twig-sql` — once, per environment. Copy the `database_id` from output.
2. Replace the placeholder `database_id` in `wrangler.jsonc` (`00000000-0000-0000-0000-000000000000`).
3. `just database-migrate-remote`.

Until step 2 is done the deploy will work locally but will be writing into the wrong / missing remote D1.
