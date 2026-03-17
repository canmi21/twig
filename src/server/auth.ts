import { createServerFn } from '@tanstack/react-start'

const CF_ACCESS_HEADER = 'cf-access-authenticated-user-email'
const CF_ACCESS_JWT_COOKIE = 'CF_Authorization'

/**
 * Decode the email from a Cloudflare Access JWT without crypto verification.
 * The JWT is already verified by Cloudflare at the edge before reaching the Worker,
 * so we only need to extract the payload.
 */
function emailFromAccessJwt(jwt: string): string | undefined {
	try {
		const [, payload] = jwt.split('.')
		if (!payload) {
			return undefined
		}
		const decoded = JSON.parse(atob(payload)) as { email?: string }
		return decoded.email
	} catch {
		return undefined
	}
}

function getCookieValue(cookieHeader: string | undefined, name: string): string | undefined {
	if (!cookieHeader) {
		return undefined
	}
	const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
	return match?.[1]
}

/** Resolve auth state from request headers/cookies. */
async function resolveAuth(): Promise<{ authenticated: boolean; email?: string }> {
	const { getRequestHeader } = await import('@tanstack/react-start/server')

	if (import.meta.env.DEV) {
		return { authenticated: true, email: 'dev@localhost' }
	}

	const headerEmail = getRequestHeader(CF_ACCESS_HEADER)
	if (headerEmail) {
		return { authenticated: true, email: headerEmail }
	}

	const cookie = getRequestHeader('cookie')
	const jwt = getCookieValue(cookie, CF_ACCESS_JWT_COOKIE)
	if (jwt) {
		const jwtEmail = emailFromAccessJwt(jwt)
		if (jwtEmail) {
			return { authenticated: true, email: jwtEmail }
		}
	}

	return { authenticated: false }
}

/**
 * Guard for write operations. Call at the top of any server function handler
 * that mutates data. Throws 401 if not authenticated.
 */
export async function requireAuth(): Promise<string> {
	const auth = await resolveAuth()
	if (!auth.authenticated) {
		throw new Error('Unauthorized')
	}
	return auth.email!
}

export const checkDashboardAuth = createServerFn({ method: 'GET' }).handler(() => resolveAuth())
