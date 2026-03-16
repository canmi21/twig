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

export const checkDashboardAuth = createServerFn({ method: 'GET' }).handler(
	async (): Promise<{ authenticated: boolean; email?: string }> => {
		const { getRequestHeader } = await import('@tanstack/react-start/server')

		// Dev mode: bypass auth when running locally
		if (import.meta.env.DEV) {
			return { authenticated: true, email: 'dev@localhost' }
		}

		// Primary: Cloudflare Access injects this header on matched paths
		const headerEmail = getRequestHeader(CF_ACCESS_HEADER)
		if (headerEmail) {
			return { authenticated: true, email: headerEmail }
		}

		// Fallback: read CF_Authorization JWT cookie (set on entire domain after Access login).
		// Needed for server function RPC requests that don't match the Access application path.
		const cookie = getRequestHeader('cookie')
		const jwt = getCookieValue(cookie, CF_ACCESS_JWT_COOKIE)
		if (jwt) {
			const jwtEmail = emailFromAccessJwt(jwt)
			if (jwtEmail) {
				return { authenticated: true, email: jwtEmail }
			}
		}

		return { authenticated: false }
	},
)
