/* src/server/timezone.ts */

import { createServerFn } from '@tanstack/react-start'

export const getTimezoneCookie = createServerFn({ method: 'GET' }).handler(async () => {
	const { getRequestHeader } = await import('@tanstack/react-start/server')
	const cookie = getRequestHeader('cookie')
	if (!cookie) {
		return null
	}
	const match = cookie.match(/\btimezone=([^;]+)/)
	return match?.[1] ?? null
})
