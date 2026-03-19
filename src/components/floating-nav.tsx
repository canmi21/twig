/* src/components/floating-nav.tsx */

import { Link, useRouterState } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import { Calendar, Compass, Hammer, House, ScrollText } from 'lucide-react'
import { AnimatePresence, motion, useMotionValue, useSpring } from 'motion/react'
import { useLayoutEffect, useRef, useState } from 'react'

const navItems: { exact: boolean; icon: LucideIcon; label: string; to: string }[] = [
	{ exact: true, icon: House, label: 'Home', to: '/' },
	{ exact: false, icon: ScrollText, label: 'Blog', to: '/blog' },
	{ exact: false, icon: Calendar, label: 'Note', to: '/note' },
	{ exact: false, icon: Hammer, label: 'Code', to: '/code' },
	{ exact: false, icon: Compass, label: 'More', to: '/more' },
]

function isActive(pathname: string, to: string, exact: boolean): boolean {
	if (exact) {
		return pathname === to
	}
	return pathname.startsWith(to)
}

const hoverTransition = { type: 'spring', stiffness: 400, damping: 30 } as const
const navSpring = { stiffness: 400, damping: 25, mass: 0.5 }
const iconLayoutTransition = { duration: 0.36, ease: [0.22, 1, 0.36, 1] } as const
const iconOpacityTransition = { duration: 0.18, ease: [0.32, 0, 0.67, 0] } as const
const iconScaleTransition = { duration: 0.28, ease: [0.34, 1.56, 0.64, 1] } as const

/** Height of the glow spot in pixels. */
const GLOW_SIZE = 20
const EDGE_STRIP_HEIGHT = 4
const ACTIVE_ICON_SIZE = 14
const ACTIVE_ICON_GAP = 4
const ACTIVE_ICON_LEAD = ACTIVE_ICON_SIZE + ACTIVE_ICON_GAP

export function FloatingNav() {
	const pathname = useRouterState({ select: (state) => state.location.pathname })
	const activeItem = navItems.find((item) => isActive(pathname, item.to, item.exact)) ?? navItems[0]

	// Hover glow
	const [hovered, setHovered] = useState<string | null>(null)
	const [glowPos, setGlowPos] = useState({ left: 0, width: 0 })
	const [cursorY, setCursorY] = useState(0)

	// Active indicator — behind glass, bottom edge
	const indLeftRaw = useMotionValue(0)
	const indLeft = useSpring(indLeftRaw, navSpring)
	const indWidthRaw = useMotionValue(0)
	const indWidth = useSpring(indWidthRaw, navSpring)
	const iconLeftRaw = useMotionValue(0)
	const iconLeft = useSpring(iconLeftRaw, navSpring)
	const iconTopRaw = useMotionValue(0)
	const iconTop = useSpring(iconTopRaw, navSpring)
	const isFirstInd = useRef(true)

	// Refs
	const wrapperRef = useRef<HTMLDivElement>(null)
	const contentRef = useRef<HTMLDivElement>(null)

	// Measure active link position for the indicator and shared icon
	useLayoutEffect(() => {
		const content = contentRef.current
		if (!content) {
			return
		}
		const activeEl = content.querySelector<HTMLElement>('[data-active]')
		if (!activeEl) {
			return
		}
		const gRect = content.getBoundingClientRect()
		const activeRect = activeEl.getBoundingClientRect()
		const { left: aLeft, top: aTop, width, height } = activeRect
		const left = aLeft - gRect.left
		const paddingLeft = Number.parseFloat(window.getComputedStyle(activeEl).paddingLeft)
		const iconLeftTarget = left + paddingLeft - ACTIVE_ICON_GAP - ACTIVE_ICON_SIZE
		const iconTopTarget = aTop - gRect.top + (height - ACTIVE_ICON_SIZE) / 2

		if (isFirstInd.current) {
			indLeftRaw.jump(left)
			indWidthRaw.jump(width)
			iconLeftRaw.jump(iconLeftTarget)
			iconTopRaw.jump(iconTopTarget)
			isFirstInd.current = false
		} else {
			indLeftRaw.set(left)
			indWidthRaw.set(width)
			iconLeftRaw.set(iconLeftTarget)
			iconTopRaw.set(iconTopTarget)
		}
	}, [pathname, iconLeftRaw, iconTopRaw, indLeftRaw, indWidthRaw])

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
		<nav className="fixed top-4 left-1/2 z-50 -translate-x-1/2" aria-label="Main navigation">
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

					<motion.div
						className="pointer-events-none absolute bottom-0"
						style={{ left: indLeft, width: indWidth, height: `${EDGE_STRIP_HEIGHT}px`, y: 1 }}
					>
						<div
							className="absolute bottom-0 h-1 rounded-full opacity-60 blur-xs"
							style={{
								left: '1px',
								right: '1px',
								background:
									'linear-gradient(90deg, transparent 0%, color-mix(in oklch, var(--accent) 10%, transparent) 16%, color-mix(in oklch, var(--accent) 66%, white 12%) 50%, color-mix(in oklch, var(--accent) 10%, transparent) 84%, transparent 100%)',
							}}
						/>
						<div
							className="absolute bottom-0 h-px rounded-full"
							style={{
								left: '1px',
								right: '1px',
								background:
									'linear-gradient(90deg, transparent 0%, color-mix(in oklch, var(--accent) 20%, transparent) 14%, color-mix(in oklch, var(--accent) 100%, white 24%) 50%, color-mix(in oklch, var(--accent) 20%, transparent) 86%, transparent 100%)',
							}}
						/>
					</motion.div>
				</div>

				{/* Glass surface */}
				<div className="bg-surface/10 ring-border-subtle pointer-events-none absolute inset-0 rounded-full shadow-(--shadow-md) ring-1 backdrop-blur-md" />

				{/* Content layer — sits above the glass surface */}
				<div
					ref={contentRef}
					className="relative z-10 flex items-center gap-0.5 rounded-full px-2.25 py-1.25"
					onMouseMove={handleMouseMove}
					onMouseLeave={() => setHovered(null)}
				>
					<motion.div
						className="pointer-events-none absolute z-20 flex size-3.5 items-center justify-center"
						style={{ left: iconLeft, top: iconTop }}
						transition={iconLayoutTransition}
					>
						<AnimatePresence mode="popLayout" initial={false}>
							<motion.span
								key={activeItem.to}
								className="text-accent flex size-3.5 items-center justify-center leading-none"
								initial={{ opacity: 0, scale: 0.72 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.72 }}
								transition={{
									opacity: iconOpacityTransition,
									scale: iconScaleTransition,
								}}
							>
								<activeItem.icon className="block size-3.5" />
							</motion.span>
						</AnimatePresence>
					</motion.div>

					{navItems.map(({ to, label, exact }) => {
						const active = isActive(pathname, to, exact)

						return (
							<Link
								key={to}
								to={to}
								activeOptions={{ exact }}
								data-active={active || undefined}
								className="group relative shrink-0 rounded-full py-1.75 pr-3.25 text-[0.78125rem] leading-none font-bold no-underline transition-colors duration-200 sm:text-[0.90625rem]"
								style={{ paddingLeft: active ? `${13 + ACTIVE_ICON_LEAD}px` : '13px' }}
								onMouseEnter={(e) => handleHover(to, e.currentTarget)}
							>
								<span
									data-label
									className={
										active
											? 'relative z-10 block'
											: 'text-content-secondary group-hover:text-content-heading relative z-10 block'
									}
									style={active ? { color: 'var(--accent)' } : undefined}
								>
									{label}
								</span>
							</Link>
						)
					})}
				</div>
			</div>
		</nav>
	)
}
