import { Link, Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/~/dashboard')({
	component: DashboardLayout,
})

const navItems = [
	{ to: '/~/dashboard', label: 'Posts', exact: true },
	{ to: '/~/dashboard/notes', label: 'Notes', exact: false },
] as const

function DashboardLayout() {
	return (
		<div className="mx-auto max-w-5xl px-6 py-8">
			<h1 className="text-content-heading text-2xl font-bold">Dashboard</h1>
			<nav className="border-border-subtle mt-4 flex gap-4 border-b pb-2">
				{navItems.map(({ to, label, exact }) => (
					<Link
						key={to}
						to={to}
						activeOptions={{ exact }}
						className="text-content-secondary hover:text-content-heading [&.active]:text-content-heading [&.active]:border-primary border-b-2 border-transparent pb-1 text-sm font-medium no-underline transition-colors"
					>
						{label}
					</Link>
				))}
			</nav>
			<div className="mt-6">
				<Outlet />
			</div>
		</div>
	)
}
