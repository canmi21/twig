/* src/lib/database/index.ts */

import { drizzle } from 'drizzle-orm/d1'
import * as contentSchema from './schema'
import * as authSchema from './auth-schema'

const schema = { ...contentSchema, ...authSchema }

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema })
}

export type Db = ReturnType<typeof createDb>
