import { defineConfig } from 'drizzle-kit';

// SQL only — no `driver: 'd1-http'` block, because we don't use
// `drizzle-kit push` (that talks to D1 over HTTP and needs creds).
// Migrations are applied via `wrangler d1 migrations apply DATABASE`,
// which reads `out` directly. Both tools agree on the `_journal.json`
// format so the dirs are shared without a bridge.
export default defineConfig({
	dialect: 'sqlite',
	schema: './src/lib/server/database/schema.ts',
	out: './database/migrations',
	strict: true,
	verbose: true
});
