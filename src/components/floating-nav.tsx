/* src/components/floating-nav.tsx */

import { Link, useRouterState } from '@tanstack/react-router'
import { LayoutGroup, motion } from 'motion/react'
import { useRef } from 'react'
import { DotCircle, House, SolidFeatherAlt, SolidHammer, TwotoneSignpost } from '~/components/icons'
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

const DARK_COLOR_MATRIX = '0.9 0 0 0 -0.3 0 0.9 0 0 -0.3 0 0 0.9 0 -0.3 0 0 0 1 0'
const LIGHT_COLOR_MATRIX = '1.03 0 0 0 0.2 0 1.03 0 0 0.2 0 0 1.03 0 0.2 0 0 0 1 0'

function isActive(pathname: string, to: string, exact: boolean): boolean {
	return exact ? pathname === to : pathname.startsWith(to)
}

const sharedLayoutTransition = { type: 'spring', stiffness: 420, damping: 32, mass: 0.52 } as const

/* ── SVG filter definition ───────────────────────────────────── */

function LiquidGlassFilter({
	glass,
	colorMatrix,
}: {
	glass: ReturnType<typeof useSvgLiquidGlass>
	colorMatrix: string
}) {
	if (!glass.displacementMap || !glass.specularMap) return null

	return (
		<svg className="absolute size-0 overflow-hidden" aria-hidden="true" focusable="false">
			<defs>
				<filter
					id={glass.filterId}
					x="0"
					y="0"
					width={glass.width}
					height={glass.height}
					filterUnits="userSpaceOnUse"
					primitiveUnits="userSpaceOnUse"
					colorInterpolationFilters="sRGB"
				>
					<feColorMatrix
						in="SourceGraphic"
						type="matrix"
						values={colorMatrix}
						result="adjusted_source"
					/>
					<feGaussianBlur in="adjusted_source" stdDeviation={glass.blur} result="blurred_source" />
					<feImage
						href={glass.displacementMap}
						x="0"
						y="0"
						width={glass.width}
						height={glass.height}
						preserveAspectRatio="none"
						result="displacement_map"
					/>
					<feDisplacementMap
						in="blurred_source"
						in2="displacement_map"
						scale={glass.scale}
						xChannelSelector="R"
						yChannelSelector="G"
						result="displaced"
					/>
					<feColorMatrix
						in="displaced"
						type="saturate"
						values={String(glass.saturation)}
						result="displaced_saturated"
					/>
					<feImage
						href={glass.specularMap}
						x="0"
						y="0"
						width={glass.width}
						height={glass.height}
						preserveAspectRatio="none"
						result="specular_layer"
					/>
					<feComposite
						in="displaced_saturated"
						in2="specular_layer"
						operator="in"
						result="specular_saturated"
					/>
					<feComponentTransfer in="specular_layer" result="specular_faded">
						<feFuncA type="linear" slope={String(glass.specularOpacity)} />
					</feComponentTransfer>
					<feBlend in="specular_saturated" in2="displaced" mode="normal" result="with_saturation" />
					<feBlend in="specular_faded" in2="with_saturation" mode="normal" />
				</filter>
			</defs>
		</svg>
	)
}

/* ── Component ───────────────────────────────────────────────── */

export function FloatingNav() {
	const pathname = useRouterState({ select: (state) => state.location.pathname })
	const theme = useTheme()
	const glassRef = useRef<HTMLDivElement>(null)

	const glass = useSvgLiquidGlass(glassRef, {
		bezelWidth: 29,
		glassThickness: 90,
		refractiveIndex: 1.3,
		blur: 1,
		scaleRatio: 1,
		specularOpacity: 0.4,
		specularSaturation: 6,
		theme,
	})

	const backdropFilter = glass.active ? `url(#${glass.filterId})` : 'blur(16px)'
	const glassBg = theme === 'dark' ? 'rgba(34, 34, 34, 0.6)' : 'rgba(255, 255, 255, 0.6)'

	return (
		<LayoutGroup id="floating-nav">
			<motion.nav
				layout="size"
				className="fixed top-4 left-1/2 z-50 -translate-x-1/2"
				aria-label="Main navigation"
				transition={sharedLayoutTransition}
			>
				<LiquidGlassFilter
					glass={glass}
					colorMatrix={theme === 'dark' ? DARK_COLOR_MATRIX : LIGHT_COLOR_MATRIX}
				/>

				<div ref={glassRef} className="relative rounded-[34px]">
					<div
						className="pointer-events-none absolute inset-0 rounded-[34px]"
						style={{
							backdropFilter,
							WebkitBackdropFilter: backdropFilter,
							background: glassBg,
						}}
					/>

					<motion.div
						layout="size"
						className="relative z-10 flex items-center gap-1.5 rounded-[34px] px-5 py-3"
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
										className="group relative block rounded-full px-3.5 py-2.25 text-[0.8125rem]/[1.05] font-bold no-underline transition-colors duration-200 sm:text-[0.9375rem]/[1.05]"
									>
										<motion.span
											layout
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
