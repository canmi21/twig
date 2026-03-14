import type { ReactNode } from 'react'

export function renderAppShell(children: ReactNode) {
	return (
		<main className="relative mx-auto min-h-screen w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12">
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-0 top-0 h-72 rounded-b-[3rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(255,255,255,0.55))] blur-3xl"
			/>
			<div className="relative">
				<header className="border-border/60 mb-10 flex flex-col gap-4 rounded-4xl border bg-white/75 px-5 py-4 shadow-[0_14px_45px_rgba(15,23,42,0.06)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
					<div>
						<div className="text-muted-foreground text-xs font-medium tracking-[0.26em] uppercase">
							~/ full-stack workspace
						</div>
						<div className="text-foreground mt-2 font-serif text-3xl italic">taki</div>
					</div>
					<div className="text-muted-foreground text-sm leading-6">
						TanStack Start, TailwindCSS, Drizzle, shadcn, Cloudflare Worker
					</div>
				</header>
				{children}
			</div>
		</main>
	)
}
