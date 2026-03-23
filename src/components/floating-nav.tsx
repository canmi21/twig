/* src/components/floating-nav.tsx */

import { Link, useRouterState } from '@tanstack/react-router'
import { LayoutGroup, motion } from 'motion/react'
import { useRef } from 'react'
import { DotCircle, House, SolidFeatherAlt, SolidHammer, TwotoneSignpost } from '~/components/icons'
import { LiquidGlassOverlay } from '~/components/liquid-glass-overlay'
import { useAdaptiveGlass } from '~/hooks/use-adaptive-glass'
import { useSvgLiquidGlass } from '~/hooks/use-svg-liquid-glass'
import { useTheme } from '~/lib/theme'

/* ── Nav configuration ───────────────────────────────────────── */

const navItems = [
	{ exact: true, icon: House, label: 'Home', to: '/' },
	{ exact: false, icon: TwotoneSignpost, label: 'Blog', to: '/blog' },
	{ exact: false, icon: SolidFeatherAlt, label: 'Note', to: '/note' },
	{ exact: false, icon: SolidHammer, label: 'Code', to: '/code' },
	{ exact: false, icon: DotCircle, label: 'More', to: '/more' },
]

function isActive(pathname: string, to: string, exact: boolean): boolean {
	return exact ? pathname === to : pathname.startsWith(to)
}

const sharedLayoutTransition = { type: 'spring', stiffness: 420, damping: 32, mass: 0.52 } as const

/* ── Component ───────────────────────────────────────────────── */

export function FloatingNav() {
	const pathname = useRouterState({ select: (state) => state.location.pathname })
	const theme = useTheme()
	const glassRef = useRef<HTMLDivElement>(null)

	const glass = useSvgLiquidGlass(glassRef, { blur: 0, theme })
	const adaptive = useAdaptiveGlass(glassRef)
	const glassBg = `rgb(var(--glass-base) / ${adaptive.bgOpacity})`

	return (
		<LayoutGroup id="floating-nav">
			<nav className="fixed top-4 left-1/2 z-50 -translate-x-1/2" aria-label="Main navigation">
				<div ref={glassRef} className="relative rounded-[24px]">
					<LiquidGlassOverlay glass={glass} borderRadius={24} background={glassBg} />

					<motion.div
						layout="position"
						className="relative z-10 flex items-center gap-0.5 px-3 py-1.5"
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
										className="group relative block rounded-full px-3 py-2 text-[0.8125rem]/[1.05] font-bold no-underline transition-colors duration-200 sm:text-[0.875rem]/[1.05]"
									>
										<motion.span
											layout="position"
											className="relative flex items-center gap-1.5"
											transition={sharedLayoutTransition}
										>
											{active ? (
												<motion.span
													layoutId="floating-nav-icon"
													className="text-accent flex size-[1em] items-center justify-center"
													transition={sharedLayoutTransition}
												>
													<Icon className="block size-[1em]" />
												</motion.span>
											) : null}
											<motion.span
												layout="position"
												className={
													active
														? 'relative block'
														: 'group-hover:!text-content-heading relative block transition-colors'
												}
												style={
													active
														? { color: 'var(--accent)' }
														: {
																color: `color-mix(in oklch, var(--text-heading) ${Math.round((1 - adaptive.intensity) * 100)}%, var(--text-secondary))`,
															}
												}
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
					{/* DEBUG: adaptive intensity */}
					<div
						className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 font-mono text-[10px] opacity-60"
						style={{ color: 'var(--text-tertiary)' }}
					>
						{adaptive.intensity.toFixed(2)} / {adaptive.bgOpacity.toFixed(2)}
					</div>
				</div>
			</nav>
		</LayoutGroup>
	)
}
