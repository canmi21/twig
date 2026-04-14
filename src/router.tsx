/* src/router.tsx */

import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export interface RootContext {
  cdnPublicUrl: string
  publicUrl: string
  canonicalUrl: string
  initialTheme: 'light' | 'dark' | null
  siteTimezone: string
}

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    context: {
      cdnPublicUrl: '',
      publicUrl: '',
      canonicalUrl: '',
      initialTheme: null,
      siteTimezone: 'UTC',
    },
  })

  return router
}
