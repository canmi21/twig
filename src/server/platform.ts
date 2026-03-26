/* src/server/platform.ts */

import { env } from 'cloudflare:workers'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '~/lib/database/schema'

/**
 * Cloudflare binding names — single source of truth.
 * Change here if bindings are renamed in wrangler.jsonc.
 */
interface Bindings {
  CONTENT: D1Database
  CACHE: KVNamespace
  BUCKET: R2Bucket
  CDN_PUBLIC_URL: string
  PUBLIC_URL: string
  CF_ACCESS_TEAM_DOMAIN: string
  CF_ACCESS_AUD: string
}

function getBindings(): Bindings {
  return env as unknown as Bindings
}

/** Drizzle D1 instance backed by the CONTENT binding. */
export function getDb() {
  return drizzle(getBindings().CONTENT, { schema })
}

/** KV namespace for compiled content cache. */
export function getCache() {
  return getBindings().CACHE
}

/** R2 bucket for media file storage. */
export function getBucket() {
  return getBindings().BUCKET
}

/** CDN public URL for media assets (production). */
export function getCdnUrl() {
  return getBindings().CDN_PUBLIC_URL
}

/** Site public URL. */
export function getPublicUrl() {
  return getBindings().PUBLIC_URL
}

/** CF Access team domain for JWT verification. */
export function getCfAccessTeamDomain() {
  return getBindings().CF_ACCESS_TEAM_DOMAIN
}

/** CF Access audience tag for JWT verification. */
export function getCfAccessAud() {
  return getBindings().CF_ACCESS_AUD
}
