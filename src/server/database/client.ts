import { env } from 'cloudflare:workers'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '~/server/database/schema'

export function getDb() {
	return drizzle(env.taki_sql, { schema })
}
