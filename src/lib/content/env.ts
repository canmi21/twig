/* src/lib/content/env.ts */

import { env } from 'cloudflare:workers'

interface CloudflareEnv {
  taki_kv: KVNamespace
  taki_sql: D1Database
  taki_bucket: R2Bucket
}

export function getEnv(): CloudflareEnv {
  return env as unknown as CloudflareEnv
}
