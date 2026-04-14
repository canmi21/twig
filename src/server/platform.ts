/* src/server/platform.ts */

import { env } from 'cloudflare:workers'
import { drizzle } from 'drizzle-orm/d1'
import * as contentSchema from '~/lib/database/schema'
import * as authSchema from '~/lib/database/auth-schema'

const schema = { ...contentSchema, ...authSchema }

/**
 * Cloudflare binding names — single source of truth.
 * Change here if bindings are renamed in wrangler.jsonc.
 */
interface Bindings {
  CONTENT: D1Database
  CACHE: KVNamespace
  BUCKET: R2Bucket
  PRESENCE: DurableObjectNamespace
  CDN_PUBLIC_URL: string
  PUBLIC_URL: string
  EMAIL_FROM_NOREPLY: string
  EMAIL_OWNER: string
  SITE_TIMEZONE: string
  BETTER_AUTH_SECRET: string
  RESEND_API_KEY: string
  SKIP_OTP_VERIFY?: string
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

/** Noreply sender address for auth and system emails. */
export function getEmailFromNoreply() {
  return getBindings().EMAIL_FROM_NOREPLY
}

/** Admin email for notifications. */
export function getEmailOwner() {
  return getBindings().EMAIL_OWNER
}

/** Canonical site timezone (IANA). Single source of truth for SSR/client date formatting. */
export function getSiteTimezone() {
  return getBindings().SITE_TIMEZONE
}

/** Better Auth secret for session signing. */
export function getBetterAuthSecret() {
  return getBindings().BETTER_AUTH_SECRET
}

/** Resend API key for sending emails. */
export function getResendApiKey() {
  return getBindings().RESEND_API_KEY
}

/** Whether to skip OTP verification (dev convenience). */
export function getSkipOtpVerify() {
  return !!getBindings().SKIP_OTP_VERIFY
}

/** Durable Object namespace for presence tracking and visitor geo. */
export function getPresence() {
  return getBindings().PRESENCE
}
