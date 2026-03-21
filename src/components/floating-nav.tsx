/* src/components/floating-nav.tsx */

import { Link, useRouterState } from '@tanstack/react-router'
import { LayoutGroup, motion } from 'motion/react'
import { useRef } from 'react'
import type { CSSProperties } from 'react'
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

const glassBackgroundOpacity = 0.6

function getGlassBackgroundTint(theme: 'light' | 'dark'): string {
	return theme === 'dark' ? 'rgb(34 34 34)' : 'rgb(255 255 255)'
}

function isActive(pathname: string, to: string, exact: boolean): boolean {
	if (exact) {
		return pathname === to
	}
	return pathname.startsWith(to)
}

const sharedLayoutTransition = { type: 'spring', stiffness: 420, damping: 32, mass: 0.52 } as const

export function FloatingNav() {
	const pathname = useRouterState({ select: (state) => state.location.pathname })
	const theme = useTheme()
	const glassFrameRef = useRef<HTMLDivElement>(null)
	const glassBackgroundTint = getGlassBackgroundTint(theme)
	const navGlassStyle = {
		'--nav-glass-bg': `color-mix(in srgb, ${glassBackgroundTint} ${glassBackgroundOpacity * 100}%, transparent)`,
	} as CSSProperties

	const svgGlass = useSvgLiquidGlass(glassFrameRef, {
		bezelWidth: 29,
		glassThickness: 90,
		refractiveIndex: 1.3,
		blur: 1,
		scaleRatio: 1,
		specularOpacity: 0.4,
		specularSaturation: 6,
		theme,
	})

	const glassBackdropFilter = svgGlass.active ? `url(#${svgGlass.filterId})` : 'blur(16px)'

	return (
		<LayoutGroup id="floating-nav">
			<motion.nav
				layout="size"
				className="fixed top-4 left-1/2 z-50 -translate-x-1/2"
				aria-label="Main navigation"
				style={navGlassStyle}
				transition={sharedLayoutTransition}
			>
				{svgGlass.displacementMap && svgGlass.specularMap ? (
					<svg className="absolute h-0 w-0 overflow-hidden" aria-hidden="true" focusable="false">
						<defs>
							<filter
								id={svgGlass.filterId}
								x="0"
								y="0"
								width={svgGlass.width}
								height={svgGlass.height}
								filterUnits="userSpaceOnUse"
								primitiveUnits="userSpaceOnUse"
								colorInterpolationFilters="sRGB"
							>
								{/* 0. Darken source in dark mode (matching kube.io) */}
								{theme === 'dark' ? (
									<feColorMatrix
										in="SourceGraphic"
										type="matrix"
										values="0.9 0 0 0 -0.3 0 0.9 0 0 -0.3 0 0 0.9 0 -0.3 0 0 0 1 0"
										result="adjusted_source"
									/>
								) : (
									<feColorMatrix
										in="SourceGraphic"
										type="matrix"
										values="1.03 0 0 0 0.2 0 1.03 0 0 0.2 0 0 1.03 0 0.2 0 0 0 1 0"
										result="adjusted_source"
									/>
								)}
								{/* 1. Blur source: frosted glass base */}
								<feGaussianBlur
									in="adjusted_source"
									stdDeviation={svgGlass.blur}
									result="blurred_source"
								/>
								{/* 2. Load displacement map */}
								<feImage
									href={svgGlass.displacementMap}
									x="0"
									y="0"
									width={svgGlass.width}
									height={svgGlass.height}
									preserveAspectRatio="none"
									result="displacement_map"
								/>
								{/* 3. Refract through glass surface */}
								<feDisplacementMap
									in="blurred_source"
									in2="displacement_map"
									scale={svgGlass.scale}
									xChannelSelector="R"
									yChannelSelector="G"
									result="displaced"
								/>
								{/* 4. Saturate displaced content */}
								<feColorMatrix
									in="displaced"
									type="saturate"
									values={String(svgGlass.saturation)}
									result="displaced_saturated"
								/>
								{/* 5. Load specular highlight */}
								<feImage
									href={svgGlass.specularMap}
									x="0"
									y="0"
									width={svgGlass.width}
									height={svgGlass.height}
									preserveAspectRatio="none"
									result="specular_layer"
								/>
								{/* 6. Mask saturated content to specular areas only */}
								<feComposite
									in="displaced_saturated"
									in2="specular_layer"
									operator="in"
									result="specular_saturated"
								/>
								{/* 7. Fade specular to controlled opacity */}
								<feComponentTransfer in="specular_layer" result="specular_faded">
									<feFuncA type="linear" slope={String(svgGlass.specularOpacity)} />
								</feComponentTransfer>
								{/* 8. Blend saturated edges over displaced base */}
								<feBlend
									in="specular_saturated"
									in2="displaced"
									mode="normal"
									result="with_saturation"
								/>
								{/* 9. Blend specular highlight on top */}
								<feBlend in="specular_faded" in2="with_saturation" mode="normal" />
							</filter>
						</defs>
					</svg>
				) : null}

				<div ref={glassFrameRef} className="relative rounded-[34px]" data-liquid-ignore="">
					<div
						className="pointer-events-none absolute inset-0 rounded-[34px]"
						style={{
							backdropFilter: glassBackdropFilter,
							WebkitBackdropFilter: glassBackdropFilter,
							background: 'var(--nav-glass-bg)',
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
													className="text-accent flex h-[1em] w-[1em] items-center justify-center"
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
