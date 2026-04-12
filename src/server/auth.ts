/* src/server/auth.ts */

import { createRemoteJWKSet, jwtVerify } from 'jose'
import { getCfAccessTeamDomain, getCfAccessAud } from './platform'

interface CfAccessIdentity {
  email: string
  sub: string
  iss: string
  iat: number
  exp: number
  [key: string]: unknown
}

// In-memory JWKS cache: one entry per team domain
const jwksCache = new Map<
  string,
  { jwks: ReturnType<typeof createRemoteJWKSet>; expiresAt: number }
>()

const JWKS_TTL_MS = 5 * 60 * 1000

function getJwks(teamDomain: string) {
  const now = Date.now()
  const cached = jwksCache.get(teamDomain)
  if (cached && cached.expiresAt > now) return cached.jwks

  // Do not cache yet — only cache after a successful verify
  return createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`))
}

function cacheJwks(
  teamDomain: string,
  jwks: ReturnType<typeof createRemoteJWKSet>,
) {
  jwksCache.set(teamDomain, { jwks, expiresAt: Date.now() + JWKS_TTL_MS })
}

function extractToken(request: Request): string | null {
  // Header takes precedence
  const header = request.headers.get('CF-Access-JWT-Assertion')
  if (header) return header

  // Fall back to cookie
  const cookie = request.headers.get('cookie')
  if (!cookie) return null

  const match = cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/)
  return match?.[1] ?? null
}

/**
 * Verify a CF Access JWT from the request.
 * Returns the identity payload on success, null on failure or missing token.
 */
export async function verifyCfAccess(
  request: Request,
): Promise<CfAccessIdentity | null> {
  const token = extractToken(request)
  if (!token) return null

  const teamDomain = getCfAccessTeamDomain()
  const aud = getCfAccessAud()

  const jwks = getJwks(teamDomain)
  try {
    const { payload } = await jwtVerify(token, jwks, {
      audience: aud,
      issuer: `${teamDomain}`,
    })
    cacheJwks(teamDomain, jwks)
    return payload as unknown as CfAccessIdentity
  } catch {
    return null
  }
}

/**
 * Guard helper for server handlers and server functions.
 * Returns the identity if authenticated, or a 401 Response if not.
 */
export async function requireAuth(
  request: Request,
): Promise<CfAccessIdentity | Response> {
  const identity = await verifyCfAccess(request)
  if (!identity) {
    return new Response('Unauthorized', { status: 401 })
  }
  return identity
}
