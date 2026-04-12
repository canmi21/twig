/* src/server/get-initial-theme.ts */

import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'

type InitialTheme = 'light' | 'dark' | null

export const getInitialTheme = createServerFn().handler((): InitialTheme => {
  const theme = getCookie('theme')
  return theme === 'light' || theme === 'dark' ? theme : null
})
