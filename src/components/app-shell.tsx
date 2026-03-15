import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ThemeToggle } from '~/components/theme-toggle'

const navItems = [
	{ to: '/', label: 'Timeline' },
	{ to: '/projects', label: 'Projects' },
	{ to: '/bookshelf', label: 'Bookshelf' },
	{ to: '/links', label: 'Links' },
	{ to: '/guestbook', label: 'Guestbook' },
	{ to: '/about', label: 'About' },
] as const

export function AppShell({ children }: { children: ReactNode }) {
	return (
		<main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-8 sm:px-6 sm:py-10">
			<header className="border-border-default mb-8 border-b pb-4">
				<div className="flex items-center justify-between gap-4">
					<Link
						to="/"
						className="text-content-heading text-2xl font-medium no-underline sm:text-3xl"
					>
						taki
					</Link>
					<ThemeToggle />
				</div>
				<nav className="mt-3 -mb-4 flex gap-1 overflow-x-auto pb-0" aria-label="Main navigation">
					{navItems.map(({ to, label }) => (
						<Link
							key={to}
							to={to}
							activeOptions={{ exact: to === '/' }}
							className="text-content-secondary hover:text-content-heading [&.active]:border-primary [&.active]:text-content-heading shrink-0 rounded-t-md px-3 py-1.5 text-sm font-medium no-underline transition-colors [&.active]:border-b-2"
						>
							{label}
						</Link>
					))}
				</nav>
			</header>
			{children}
		</main>
	)
}
