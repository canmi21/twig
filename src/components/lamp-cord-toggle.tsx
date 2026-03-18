/* src/components/lamp-cord-toggle.tsx */

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useSpring, useTransform } from 'motion/react'
import { setThemeCookie } from '~/lib/theme'
import type { ThemePreference } from '~/lib/theme'

function readPreference(): ThemePreference {
	const m = document.cookie.match(/\btheme=(light|dark)\b/)
	if (m?.[1] === 'light' || m?.[1] === 'dark') {
		return m[1]
	}
	return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function applyTheme(resolved: ThemePreference) {
	document.documentElement.classList.toggle('dark', resolved === 'dark')
	document.documentElement.style.colorScheme = resolved
}

const CORD_REST = 64
const CORD_PULLED = 88
/** Minimum drag distance (px) to trigger theme toggle on release */
const DRAG_TRIGGER = 120
/** Movement threshold (px) to distinguish drag from tap */
const DRAG_DEAD_ZONE = 8

export function LampCordToggle({ initialTheme }: { initialTheme: ThemePreference }) {
	const [preference, setPreference] = useState<ThemePreference>(() => {
		if (typeof document === 'undefined') {
			return initialTheme
		}
		return readPreference()
	})
	const [isBroken, setIsBroken] = useState(false)

	const handleRef = useRef<HTMLDivElement>(null)
	const buttonRef = useRef<HTMLButtonElement>(null)
	const isToggling = useRef(false)

	// pointer state: idle → pressed → dragging
	const pointerState = useRef<'idle' | 'pressed' | 'dragging'>('idle')
	const pressOrigin = useRef({ x: 0, y: 0 })
	const anchorPos = useRef({ x: 0, y: 0 })
	const lockedAngle = useRef(0)

	// spring-driven cord length
	const cordLength = useSpring(CORD_REST, { stiffness: 400, damping: 15, mass: 0.5 })
	const cordHeight = useTransform(cordLength, (px) => `${px}px`)

	// spring-driven swing for entire cord + handle assembly
	const cordRotate = useSpring(0, { stiffness: 300, damping: 10, mass: 0.3 })

	// break animation: cord flies off screen
	const breakY = useSpring(0, { stiffness: 80, damping: 8, mass: 0.5 })
	const breakOpacity = useSpring(1, { stiffness: 200, damping: 20 })

	// --- theme toggle (shared by tap and drag-release) ---
	const performToggle = useCallback(() => {
		const next = preference === 'dark' ? 'light' : 'dark'

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- not all browsers implement View Transition API
		if (document.startViewTransition && handleRef.current) {
			const rect = handleRef.current.getBoundingClientRect()
			const cx = rect.left + rect.width / 2
			const cy = rect.top + rect.height / 2
			const radius = Math.hypot(
				Math.max(cx, window.innerWidth - cx),
				Math.max(cy, window.innerHeight - cy),
			)

			document.documentElement.classList.add('radial-transition')
			const transition = document.startViewTransition(() => {
				applyTheme(next)
			})

			void transition.ready.then(() => {
				document.documentElement.animate(
					{
						clipPath: [`circle(0px at ${cx}px ${cy}px)`, `circle(${radius}px at ${cx}px ${cy}px)`],
					},
					{ duration: 500, easing: 'ease-out', pseudoElement: '::view-transition-new(root)' },
				)
			})

			void transition.finished.then(() => {
				document.documentElement.classList.remove('radial-transition')
			})
		} else {
			applyTheme(next)
		}

		setThemeCookie(next)
		setPreference(next)
	}, [preference])

	// --- tap toggle: pull along locked angle, then spring back ---
	function tapToggle() {
		isToggling.current = true

		// pull downward along the locked angle direction
		cordLength.set(CORD_PULLED)
		setTimeout(() => cordLength.set(CORD_REST), 150)

		// small overshoot wobble from the locked angle, then return to center
		const base = lockedAngle.current
		cordRotate.set(base + 4)
		setTimeout(() => cordRotate.set(base - 2), 120)
		setTimeout(() => {
			cordRotate.set(0)
			isToggling.current = false
		}, 300)

		performToggle()
	}

	// --- pointer handlers ---
	const onPointerDown = useCallback(
		(ev: React.PointerEvent) => {
			if (isBroken || isToggling.current) {
				return
			}
			ev.preventDefault()

			// capture on the button itself so move/up events always fire here
			buttonRef.current?.setPointerCapture(ev.pointerId)

			pointerState.current = 'pressed'
			pressOrigin.current = { x: ev.clientX, y: ev.clientY }

			// lock the current sway angle at press time
			lockedAngle.current = cordRotate.get()

			// anchor = the fixed ceiling attachment point (unrotated top-center)
			// use the button's CSS-fixed position, not getBoundingClientRect
			// which reflects the current rotation
			if (buttonRef.current) {
				const { style } = buttonRef.current
				const prevRotate = style.rotate
				style.rotate = '0deg'
				const rect = buttonRef.current.getBoundingClientRect()
				style.rotate = prevRotate
				anchorPos.current = { x: rect.left + rect.width / 2, y: rect.top }
			}
		},
		[isBroken, cordRotate],
	)

	const onPointerMove = useCallback(
		(ev: React.PointerEvent) => {
			const state = pointerState.current

			if (state === 'idle') {
				// hover sway: cord tilts away from cursor
				if (!isToggling.current && buttonRef.current) {
					const rect = buttonRef.current.getBoundingClientRect()
					const centerX = rect.left + rect.width / 2
					const offset = (ev.clientX - centerX) / rect.width
					cordRotate.set(offset * 5)
				}
				return
			}

			if (state === 'pressed') {
				// check if we've moved enough to start a real drag
				const movedX = ev.clientX - pressOrigin.current.x
				const movedY = ev.clientY - pressOrigin.current.y
				if (Math.sqrt(movedX * movedX + movedY * movedY) < DRAG_DEAD_ZONE) {
					// still within dead zone: keep angle locked, don't move
					return
				}
				pointerState.current = 'dragging'
			}

			// dragging: cord follows cursor
			const dx = ev.clientX - anchorPos.current.x
			const dy = ev.clientY - anchorPos.current.y
			const dist = Math.sqrt(dx * dx + dy * dy)

			cordLength.jump(Math.max(dist, CORD_REST))

			const angle = Math.atan2(-dx, Math.max(dy, 1)) * (180 / Math.PI)
			cordRotate.jump(angle)
		},
		[cordLength, cordRotate],
	)

	function onPointerUp(ev: React.PointerEvent) {
		const state = pointerState.current
		pointerState.current = 'idle'
		buttonRef.current?.releasePointerCapture(ev.pointerId)

		// tap: pointer was pressed but never moved into drag
		if (state === 'pressed') {
			tapToggle()
			return
		}

		if (state !== 'dragging') {
			return
		}

		// compute final drag distance
		const dx = ev.clientX - anchorPos.current.x
		const dy = ev.clientY - anchorPos.current.y
		const dist = Math.sqrt(dx * dx + dy * dy)
		const halfPage = window.innerHeight / 2

		if (dist >= halfPage) {
			// easter egg: cord breaks and flies off
			breakY.set(window.innerHeight + 200)
			breakOpacity.set(0)
			setTimeout(() => setIsBroken(true), 600)
			return
		}

		if (dist >= DRAG_TRIGGER) {
			performToggle()
		}

		// spring back to rest position
		cordLength.set(CORD_REST)

		// wobble back to vertical
		cordRotate.set(dist > 40 ? -6 : 0)
		setTimeout(() => cordRotate.set(dist > 40 ? 3 : 0), 150)
		setTimeout(() => cordRotate.set(0), 350)
	}

	// reset cord if pointer is lost (leaves window, capture cancelled, etc.)
	function resetFromDrag() {
		if (pointerState.current !== 'idle') {
			pointerState.current = 'idle'
			cordLength.set(CORD_REST)
			cordRotate.set(0)
		}
	}

	const onPointerLeave = useCallback(() => {
		if (pointerState.current === 'idle' && !isToggling.current) {
			cordRotate.set(0)
		}
	}, [cordRotate])

	// prevent native drag on the button
	useEffect(() => {
		const el = buttonRef.current
		if (!el) {
			return
		}
		const prevent = (ev: Event) => ev.preventDefault()
		el.addEventListener('dragstart', prevent)
		return () => el.removeEventListener('dragstart', prevent)
	}, [])

	if (isBroken) {
		return null
	}

	return (
		<motion.button
			ref={buttonRef}
			type="button"
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onPointerCancel={resetFromDrag}
			onLostPointerCapture={resetFromDrag}
			onPointerLeave={onPointerLeave}
			className="group fixed top-0 right-6 z-50 flex cursor-pointer touch-none flex-col items-center border-none bg-transparent p-0 sm:right-8"
			aria-label={preference === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
			style={{
				rotate: cordRotate,
				y: breakY,
				opacity: breakOpacity,
				transformOrigin: 'top center',
			}}
		>
			{/* Cord */}
			<motion.div className="bg-border-strong w-px" style={{ height: cordHeight }} />
			{/* Handle */}
			<div
				ref={handleRef}
				className="bg-content-tertiary group-hover:bg-primary size-5 w-2 rounded-full transition-colors"
			/>
		</motion.button>
	)
}
