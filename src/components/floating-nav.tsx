import { Link } from '@tanstack/react-router'

const navItems = [{ to: '/', label: 'Home' }] as const

export function FloatingNav() {
	return (
		<nav className="fixed top-4 left-1/2 z-50 -translate-x-1/2" aria-label="Main navigation">
			<div className="bg-surface/80 ring-border-subtle flex items-center gap-0.5 rounded-full px-2 py-1 shadow-[var(--shadow-md)] ring-1 backdrop-blur-lg">
				{navItems.map(({ to, label }) => (
					<Link
						key={to}
						to={to}
						activeOptions={{ exact: to === '/' }}
						className="text-content-secondary hover:text-content-heading [&.active]:text-content-heading [&.active]:after:bg-primary relative shrink-0 rounded-full px-3 py-1.5 text-xs font-medium no-underline transition-colors sm:text-sm [&.active]:after:absolute [&.active]:after:bottom-0 [&.active]:after:left-1/2 [&.active]:after:h-0.5 [&.active]:after:w-4 [&.active]:after:-translate-x-1/2 [&.active]:after:rounded-full [&.active]:after:content-['']"
					>
						{label}
					</Link>
				))}
			</div>
		</nav>
	)
}
