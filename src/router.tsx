/* src/router.tsx */

import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export interface RootContext {
  cdnPublicUrl: string
  theme: 'light' | 'dark'
}

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    context: {
      cdnPublicUrl: '',
      theme: 'light',
    },
  })

  return router
}
