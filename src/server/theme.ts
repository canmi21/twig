/* src/server/theme.ts */

import { createServerFn } from '@tanstack/react-start'

export const getThemeCookie = createServerFn({ method: 'GET' }).handler(async () => {
	const { getRequestHeader } = await import('@tanstack/react-start/server')
	const cookie = getRequestHeader('cookie')
	if (!cookie) {
		return null
	}
	const m = cookie.match(/\btheme=(light|dark)\b/)
	if (!m) {
		return null
	}
	return m[1] as 'light' | 'dark'
})