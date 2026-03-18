/* src/routes/~.tsx */

import { Link, Outlet, createFileRoute, getRouteApi, redirect } from '@tanstack/react-router'
import { ArrowLeft, FileText, Notebook, Settings } from 'lucide-react'
import { LampCordToggle } from '~/components/lamp-cord-toggle'
import { checkDashboardAuth } from '~/server/auth'

export const Route = createFileRoute('/~')({
	beforeLoad: async () => {
		const auth = await checkDashboardAuth()
		if (!auth.authenticated) {
			// eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect convention
			throw redirect({ to: '/' })
		}
	},
	component: DashboardLayout,
})

const rootRoute = getRouteApi('__root__')

const navItems = [
	{ to: '/~' as const, label: 'Posts', icon: FileText, exact: true },
	{ to: '/~/notes' as const, label: 'Notes', icon: Notebook, exact: false },
	{ to: '/~/settings' as const, label: 'Settings', icon: Settings, exact: false },
]

function DashboardLayout() {
	const { theme } = rootRoute.useRouteContext()
	return (
		<div className="bg-background flex min-h-screen">
			<LampCordToggle initialTheme={theme} />

			{/* Sidebar */}
			<aside className="border-border-default bg-sunken flex w-60 shrink-0 flex-col border-r">
				{/* Brand */}
				<div className="border-border-default flex h-14 items-center border-b px-5">
					<span className="text-content-heading text-sm font-bold tracking-widest uppercase">
						taki
					</span>
				</div>

				{/* Navigation */}
				<nav className="flex-1 px-3 pt-4">
					<ul className="m-0 list-none space-y-1 p-0">
						{navItems.map(({ to, label, icon: Icon, exact }) => (
							<li key={to}>
								<Link
									to={to}
									activeOptions={{ exact }}
									className="text-content-secondary hover:bg-elevated hover:text-content-heading [&.active]:bg-accent-subtle [&.active]:text-accent-on-subtle flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors"
								>
									<Icon size={18} />
									{label}
								</Link>
							</li>
						))}
					</ul>
				</nav>

				{/* Back to site */}
				<div className="border-border-default border-t p-3">
					<Link
						to="/"
						className="text-content-secondary hover:bg-elevated hover:text-content-heading flex items-center gap-3 rounded-lg px-3 py-2 text-sm no-underline transition-colors"
					>
						<ArrowLeft size={18} />
						Back to site
					</Link>
				</div>
			</aside>

			{/* Main */}
			<div className="flex flex-1 flex-col">
				{/* Header bar — placeholder for breadcrumbs / page title */}
				<header className="border-border-default flex h-14 shrink-0 items-center border-b px-6" />

				{/* Content */}
				<main className="flex-1 overflow-y-auto p-6">
					<Outlet />
				</main>
			</div>
		</div>
	)
}
