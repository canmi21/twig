import { createFileRoute, getRouteApi, Link, Outlet, redirect } from '@tanstack/react-router'
import { LayoutDashboard, FilePlus, StickyNote, Settings, ArrowLeft } from 'lucide-react'
import { checkDashboardAuth } from '~/features/dashboard/server/auth'

export const Route = createFileRoute('/dashboard')({
	beforeLoad: async () => {
		const auth = await checkDashboardAuth()
		if (!auth.authenticated) {
			// eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
			throw redirect({ to: '/' })
		}
		return { email: auth.email }
	},
	component: DashboardLayout,
})

const sidebarNav = [
	{ to: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
	{ to: '/dashboard/editor', label: 'New Post', icon: FilePlus, search: { type: 'post' } },
	{
		to: '/dashboard/editor',
		label: 'New Note',
		icon: StickyNote,
		search: { type: 'note' },
	},
	{ to: '/dashboard/settings', label: 'Settings', icon: Settings },
] as const

const rootApi = getRouteApi('__root__')

function DashboardLayout() {
	const { email } = Route.useRouteContext()
	const { settings } = rootApi.useLoaderData()

	return (
		<div className="flex h-screen overflow-hidden">
			{/* Sidebar */}
			<aside className="bg-surface border-border-default flex w-52 shrink-0 flex-col border-r">
				<div className="border-border-default border-b px-4 py-4">
					<h1 className="text-content-heading text-sm font-semibold">
						{settings.siteTitle} dashboard
					</h1>
					{email && <p className="text-content-tertiary mt-0.5 truncate text-xs">{email}</p>}
				</div>

				<nav className="flex-1 space-y-0.5 px-2 py-3">
					{sidebarNav.map(({ to, label, icon: Icon, ...rest }) => (
						<Link
							key={label}
							to={to}
							search={'search' in rest ? rest.search : undefined}
							activeOptions={'exact' in rest ? { exact: rest.exact } : undefined}
							className="text-content-secondary hover:bg-surface-raised hover:text-content-heading [&.active]:bg-surface-raised [&.active]:text-content-heading flex items-center gap-2 rounded-md px-3 py-2 text-sm no-underline transition-colors"
						>
							<Icon className="size-4 shrink-0" />
							{label}
						</Link>
					))}
				</nav>

				<div className="border-border-default border-t px-2 py-3">
					<Link
						to="/"
						className="text-content-tertiary hover:text-content-secondary flex items-center gap-2 px-3 py-2 text-xs no-underline transition-colors"
					>
						<ArrowLeft className="size-3.5" />
						Back to site
					</Link>
				</div>
			</aside>

			{/* Main content */}
			<div className="flex-1 overflow-y-auto">
				<div className="mx-auto max-w-5xl px-6 py-8">
					<Outlet />
				</div>
			</div>
		</div>
	)
}
