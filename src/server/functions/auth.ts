import { createServerFn } from '@tanstack/react-start'

const CF_ACCESS_HEADER = 'cf-access-authenticated-user-email'

export const checkDashboardAuth = createServerFn({ method: 'GET' }).handler(
	async (): Promise<{ authenticated: boolean; email?: string }> => {
		const { getRequestHeader } = await import('@tanstack/react-start/server')

		// Dev mode: bypass auth when running locally
		const isDev = import.meta.env.DEV
		if (isDev) {
			return { authenticated: true, email: 'dev@localhost' }
		}

		const email = getRequestHeader(CF_ACCESS_HEADER)
		if (!email) {
			return { authenticated: false }
		}

		return { authenticated: true, email }
	},
)
