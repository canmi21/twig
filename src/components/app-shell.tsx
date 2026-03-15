import type { ReactNode } from 'react'
import { ThemeToggle } from '~/components/theme-toggle'

export function renderAppShell(children: ReactNode) {
	return (
		<main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-8 sm:px-6 sm:py-10">
			<header className="border-border-default mb-8 flex items-center justify-between gap-4 border-b pb-4">
				<a href="/" className="text-content-heading text-2xl font-medium no-underline sm:text-3xl">
					taki
				</a>
				<ThemeToggle />
			</header>
			{children}
		</main>
	)
}
