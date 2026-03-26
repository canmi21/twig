/* src/router.tsx */

import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export interface RootContext {
  cdnPublicUrl: string
  initialTheme: 'light' | 'dark' | null
}

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    context: {
      cdnPublicUrl: '',
      initialTheme: null,
    },
  })

  return router
}
