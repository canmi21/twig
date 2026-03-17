import { createServerFn } from '@tanstack/react-start'

export const checkDashboardAuth = createServerFn({ method: 'GET' }).handler(async () => {
	const { resolveAuth } = await import('~/server/auth.server')
	return resolveAuth()
})
