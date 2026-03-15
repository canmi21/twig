import type { ReactNode } from 'react'
import { ThemeToggle } from '~/components/theme-toggle'

export function renderAppShell(children: ReactNode) {
	return (
		<main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-5 sm:px-7 sm:py-8">
			<div className="border-border bg-card mx-auto max-w-4xl rounded-[2rem] border px-5 py-5 shadow-[0_24px_80px_var(--shadow-color)] sm:px-8 sm:py-7">
				<header className="border-border/80 mb-8 flex items-center justify-between gap-4 border-b pb-5">
					<a
						href="/"
						className="text-foreground font-serif text-3xl tracking-tight italic no-underline sm:text-4xl"
					>
						taki
					</a>
					<ThemeToggle />
				</header>
				{children}
			</div>
		</main>
	)
}
