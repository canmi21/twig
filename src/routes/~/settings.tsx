/* src/routes/~/settings.tsx */

import { Link, Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/~/settings')({
	component: SettingsLayout,
})

const tabs = [
	{ to: '/~/settings' as const, label: 'General', exact: true },
	{ to: '/~/settings/footer' as const, label: 'Footer', exact: false },
	{ to: '/~/settings/assets' as const, label: 'Assets', exact: false },
]

function SettingsLayout() {
	return (
		<div>
			<h2 className="text-content-heading mb-4 text-lg font-semibold">Settings</h2>
			<nav className="border-border-subtle mb-6 flex gap-4 border-b">
				{tabs.map(({ to, label, exact }) => (
					<Link
						key={to}
						to={to}
						activeOptions={{ exact }}
						className="text-content-secondary hover:text-content-heading [&.active]:text-accent-on-subtle border-b-2 border-transparent px-1 pb-2 text-sm font-medium no-underline transition-colors [&.active]:border-current"
					>
						{label}
					</Link>
				))}
			</nav>
			<Outlet />
		</div>
	)
}
