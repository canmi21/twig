/* src/components/floating-nav.tsx */

import { Link, useRouterState } from '@tanstack/react-router'
import { motion } from 'motion/react'

const navItems: { exact: boolean; label: string; to: string }[] = [
	{ exact: true, label: 'Home', to: '/' },
	{ exact: false, label: 'Blog', to: '/blog' },
	{ exact: false, label: 'Note', to: '/note' },
	{ exact: false, label: 'Code', to: '/code' },
	{ exact: false, label: 'More', to: '/more' },
]

function isActive(pathname: string, to: string, exact: boolean): boolean {
	if (exact) {
		return pathname === to
	}
	return pathname.startsWith(to)
}

export function FloatingNav() {
	const pathname = useRouterState({ select: (state) => state.location.pathname })

	return (
		<nav className="fixed top-4 left-1/2 z-50 -translate-x-1/2" aria-label="Main navigation">
			<div className="bg-surface/60 ring-border-subtle flex items-center gap-0.5 rounded-full px-2 py-1 shadow-(--shadow-md) ring-1 backdrop-blur-md">
				{navItems.map(({ to, label, exact }) => {
					const active = isActive(pathname, to, exact)

					return (
						<Link
							key={to}
							to={to}
							activeOptions={{ exact }}
							className="relative shrink-0 rounded-full px-3 py-1.5 text-xs font-medium no-underline transition-colors sm:text-sm"
							activeProps={{ className: 'text-content-heading' }}
							inactiveProps={{ className: 'text-content-secondary hover:text-content-heading' }}
						>
							{label}
							{active && (
								<motion.div
									layoutId="nav-indicator"
									className="bg-primary absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full"
									transition={{ type: 'spring', stiffness: 400, damping: 25, mass: 0.5 }}
								/>
							)}
						</Link>
					)
				})}
			</div>
		</nav>
	)
}
