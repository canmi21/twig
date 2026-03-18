/* src/components/floating-nav.tsx */

import { Link, useRouterState } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { useRef, useState } from 'react'

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

const hoverTransition = { type: 'spring', stiffness: 400, damping: 30 } as const

/** Height of the glow spot in pixels. */
const GLOW_SIZE = 20

export function FloatingNav() {
	const pathname = useRouterState({ select: (state) => state.location.pathname })
	const [hovered, setHovered] = useState<string | null>(null)
	const [glowPos, setGlowPos] = useState({ left: 0, width: 0 })
	const [cursorY, setCursorY] = useState(0)
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
		<nav className="fixed top-4 left-1/2 z-50 -translate-x-1/2" aria-label="Main navigation">
			<div className="relative" ref={wrapperRef}>
				{/* Clip shell — matches the glass pill shape, hides glow overflow */}
				<div className="absolute inset-0 overflow-hidden rounded-full">
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

				{/* Glass surface */}
				<div
					className="bg-surface/60 ring-border-subtle relative flex items-center gap-0.5 overflow-hidden rounded-full px-2 py-1 shadow-(--shadow-md) ring-1 backdrop-blur-md"
					onMouseMove={handleMouseMove}
					onMouseLeave={() => setHovered(null)}
				>
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
								onMouseEnter={(e) => handleHover(to, e.currentTarget)}
							>
								<span className="relative z-1">{label}</span>
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
			</div>
		</nav>
	)
}
