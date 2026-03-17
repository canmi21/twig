/* src/router.tsx */

import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { routeTree } from './routeTree.gen'

export function getRouter() {
	const queryClient = new QueryClient()
	const router = createTanStackRouter({
		defaultPreload: 'intent',

		defaultPreloadStaleTime: 0,
		routeTree,
		scrollRestoration: true,
	})

	setupRouterSsrQueryIntegration({
		queryClient,
		router,
	})

	return router
}

declare module '@tanstack/react-router' {
	interface Register {
		router: ReturnType<typeof getRouter>
	}
}