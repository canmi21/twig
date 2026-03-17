import { createServerFn } from '@tanstack/react-start'
import { createRemoteJWKSet, jwtVerify } from 'jose'

import type { JWTVerifyGetKey } from 'jose'

const CF_ACCESS_JWT_HEADER = 'cf-access-jwt-assertion'
const CF_ACCESS_JWT_COOKIE = 'CF_Authorization'

let jwks: JWTVerifyGetKey | undefined = undefined

/** Lazily create and cache the JWKS fetcher for the configured team domain. */
function getJwks(teamDomain: string): JWTVerifyGetKey {
	jwks ??= createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`))
	return jwks
}

function getCookieValue(cookieHeader: string | undefined, name: string): string | undefined {
	if (!cookieHeader) {
		return undefined
	}
	const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
	return match?.[1]
}

/**
 * Verify a Cloudflare Access JWT with full signature + claims validation.
 * Returns the email on success, undefined on any failure.
 */
async function verifyAccessJwt(
	token: string,
	teamDomain: string,
	aud: string,
): Promise<string | undefined> {
	try {
		const { payload } = await jwtVerify(token, getJwks(teamDomain), {
			audience: aud,
			issuer: `${teamDomain}`,
		})
		return (payload as { email?: string }).email
	} catch {
		return undefined
	}
}

/** Resolve auth state from request headers/cookies. */
async function resolveAuth(): Promise<{ authenticated: boolean; email?: string }> {
	const { getRequestHeader } = await import('@tanstack/react-start/server')

	if (import.meta.env.DEV) {
		return { authenticated: true, email: 'dev@localhost' }
	}

	const teamDomain = process.env.CF_ACCESS_TEAM_DOMAIN
	const aud = process.env.CF_ACCESS_AUD

	// Prefer Cf-Access-Jwt-Assertion header, fall back to cookie
	const token =
		getRequestHeader(CF_ACCESS_JWT_HEADER) ??
		getCookieValue(getRequestHeader('cookie'), CF_ACCESS_JWT_COOKIE)

	if (!token) {
		return { authenticated: false }
	}

	const email = await verifyAccessJwt(token, teamDomain, aud)
	if (email) {
		return { authenticated: true, email }
	}

	return { authenticated: false }
}

/**
 * Guard for protected operations. Call at the top of any server function handler
 * that requires authentication. Throws 401 if not authenticated.
 */
export async function requireAuth(): Promise<string> {
	const auth = await resolveAuth()
	if (!auth.authenticated) {
		throw new Error('Unauthorized')
	}
	return auth.email!
}

export const checkDashboardAuth = createServerFn({ method: 'GET' }).handler(() => resolveAuth())
