/* src/routes/~.tsx */

import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { checkDashboardAuth } from '~/server/auth'

export const Route = createFileRoute('/~')({
	beforeLoad: async () => {
		const auth = await checkDashboardAuth()
		if (!auth.authenticated) {
			// eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect convention
			throw redirect({ to: '/' })
		}
	},
	component: () => <Outlet />,
})