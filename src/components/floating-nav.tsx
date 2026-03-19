/* src/components/floating-nav.tsx */

import { Link, useRouterState } from '@tanstack/react-router'
import { LayoutGroup, motion } from 'motion/react'
import { useRef, useState } from 'react'
import { DotCircle, SolidHammer, SolidFeatherAlt, House, TwotoneSignpost } from '~/components/icons'

const navItems = [
	{ exact: true, icon: House, label: 'Home', to: '/' },
	{ exact: false, icon: TwotoneSignpost, label: 'Blog', to: '/blog' },
	{ exact: false, icon: SolidFeatherAlt, label: 'Note', to: '/note' },
	{ exact: false, icon: SolidHammer, label: 'Code', to: '/code' },
	{ exact: false, icon: DotCircle, label: 'More', to: '/more' },
]

function isActive(pathname: string, to: string, exact: boolean): boolean {
	if (exact) {
		return pathname === to
	}
	return pathname.startsWith(to)
}

const hoverTransition = { type: 'spring', stiffness: 400, damping: 30 } as const
const sharedLayoutTransition = { type: 'spring', stiffness: 420, damping: 32, mass: 0.52 } as const

/** Height of the glow spot in pixels. */
const GLOW_SIZE = 20

export function FloatingNav() {
	const pathname = useRouterState({ select: (state) => state.location.pathname })

	// Hover glow
	const [hovered, setHovered] = useState<string | null>(null)
	const [glowPos, setGlowPos] = useState({ left: 0, width: 0 })
	const [cursorY, setCursorY] = useState(0)

	// Refs
	const wrapperRef = useRef<HTMLDivElement>(null)

	function handleHover(to: string, el: HTMLElement) {
		setHovered(to)
		const wrapper = wrapperRef.current
		if (!wrapper) {
			return
		}
		const wRect = wrapper.getBoundingClientRect()
		const iRect = el.getBoundingClientRect()
		setGlowPos({ left: iRect.left - wRect.left, width: iRect.width })
	}

	function handleMouseMove(e: React.MouseEvent) {
		const wrapper = wrapperRef.current
		if (!wrapper) {
			return
		}
		setCursorY(e.clientY - wrapper.getBoundingClientRect().top)
	}

	return (
		<LayoutGroup id="floating-nav">
			<motion.nav
				layout="size"
				className="fixed top-4 left-1/2 z-50 -translate-x-1/2"
				aria-label="Main navigation"
				transition={sharedLayoutTransition}
			>
				<div className="relative" ref={wrapperRef}>
					{/* Effect layer — sits below the frosted glass surface */}
					<div className="absolute inset-0 overflow-hidden rounded-full">
						{/* Hover glow */}
						<motion.div
							className="bg-primary/20 absolute h-5 rounded-full"
							initial={false}
							animate={{
								left: glowPos.left,
								width: glowPos.width,
								top: cursorY - GLOW_SIZE / 2,
								opacity: hovered ? 1 : 0,
							}}
							transition={{
								left: hoverTransition,
								width: hoverTransition,
								top: { type: 'spring', stiffness: 800, damping: 40 },
								opacity: { duration: 0.15 },
							}}
						/>
					</div>

					{/* Indicator layer — shares the same layout slots as content, but stays below glass */}
					<motion.div
						layout="size"
						aria-hidden="true"
						className="pointer-events-none absolute inset-0 flex items-center gap-0.5 rounded-full px-2.25 py-1.25"
						transition={sharedLayoutTransition}
					>
						{navItems.map(({ to, label, exact, icon: Icon }) => {
							const active = isActive(pathname, to, exact)

							return (
								<motion.div
									key={`indicator-${to}`}
									layout="position"
									className="shrink-0"
									transition={sharedLayoutTransition}
								>
									<div className="relative block rounded-full px-3.25 py-1.75 text-[0.78125rem]/[1.1] font-bold sm:text-[0.90625rem]/[1.1]">
										<span className="invisible flex items-center">
											{active ? (
												<span className="mr-1 flex h-[1em] w-[1em] items-center justify-center">
													<Icon className="block h-[1em] w-[1em]" />
												</span>
											) : null}
											<span>{label}</span>
										</span>

										{active ? (
											<motion.span
												layoutId="floating-nav-indicator"
												className="absolute right-3.25 bottom-0 left-3.25 h-1"
												transition={sharedLayoutTransition}
											>
												<span
													className="absolute inset-x-0 bottom-0 h-1 rounded-full opacity-60 blur-xs"
													style={{
														background:
															'linear-gradient(90deg, transparent 0%, color-mix(in oklch, var(--accent) 10%, transparent) 16%, color-mix(in oklch, var(--accent) 66%, white 12%) 50%, color-mix(in oklch, var(--accent) 10%, transparent) 84%, transparent 100%)',
													}}
												/>
												<span
													className="absolute inset-x-0 bottom-0 h-px rounded-full"
													style={{
														background:
															'linear-gradient(90deg, transparent 0%, color-mix(in oklch, var(--accent) 20%, transparent) 14%, color-mix(in oklch, var(--accent) 100%, white 24%) 50%, color-mix(in oklch, var(--accent) 20%, transparent) 86%, transparent 100%)',
													}}
												/>
											</motion.span>
										) : null}
									</div>
								</motion.div>
							)
						})}
					</motion.div>

					{/* Glass surface */}
					<div className="bg-surface/10 ring-border-subtle pointer-events-none absolute inset-0 rounded-full shadow-(--shadow-md) ring-1 backdrop-blur-md" />

					{/* Content layer — sits above the glass surface */}
					<motion.div
						layout="size"
						className="relative z-10 flex items-center gap-0.5 rounded-full px-2.25 py-1.25"
						onMouseMove={handleMouseMove}
						onMouseLeave={() => setHovered(null)}
						transition={sharedLayoutTransition}
					>
						{navItems.map(({ to, label, exact, icon: Icon }) => {
							const active = isActive(pathname, to, exact)

							return (
								<motion.div
									key={to}
									layout="position"
									className="shrink-0"
									transition={sharedLayoutTransition}
								>
									<Link
										to={to}
										activeOptions={{ exact }}
										data-active={active || undefined}
										className="group relative block rounded-full px-3.25 py-1.75 text-[0.78125rem]/[1.1] font-bold no-underline transition-colors duration-200 sm:text-[0.90625rem]/[1.1]"
										onMouseEnter={(e) => handleHover(to, e.currentTarget)}
									>
										<motion.span
											layout
											className="relative z-10 flex items-center"
											transition={sharedLayoutTransition}
										>
											{active ? (
												<motion.span
													layoutId="floating-nav-icon"
													className="text-accent mr-1 flex h-[1em] w-[1em] items-center justify-center"
													transition={sharedLayoutTransition}
												>
													<Icon className="block h-[1em] w-[1em]" />
												</motion.span>
											) : null}
											<motion.span
												layout
												className={
													active
														? 'relative block'
														: 'text-content-secondary group-hover:text-content-heading relative block'
												}
												style={active ? { color: 'var(--accent)' } : undefined}
												transition={sharedLayoutTransition}
											>
												{label}
											</motion.span>
										</motion.span>
									</Link>
								</motion.div>
							)
						})}
					</motion.div>
				</div>
			</motion.nav>
		</LayoutGroup>
	)
}
