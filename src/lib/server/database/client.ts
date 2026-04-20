import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from './schema';

export type Database = DrizzleD1Database<typeof schema>;

// Construct in request scope — the D1 binding only exists once a request
// is in-flight. Module-top-level `drizzle(...)` would crash on cold start
// because `platform.env.DATABASE` is unbound at import time on Workers.
export function getDatabase(env: Env): Database {
	return drizzle(env.DATABASE, { schema });
}
