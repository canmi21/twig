/* src/components/lamp-cord-toggle.tsx */

import { useCallback, useRef, useState } from 'react'
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

export function LampCordToggle({ initialTheme }: { initialTheme: ThemePreference }) {
	const [preference, setPreference] = useState<ThemePreference>(() => {
		if (typeof document === 'undefined') {
			return initialTheme
		}
		return readPreference()
	})

	const handleRef = useRef<HTMLDivElement>(null)

	// spring-driven cord length
	const cordLength = useSpring(CORD_REST, { stiffness: 400, damping: 15, mass: 0.5 })
	const cordHeight = useTransform(cordLength, (px) => `${px}px`)

	// spring-driven swing for entire cord + handle assembly
	const cordRotate = useSpring(0, { stiffness: 300, damping: 10, mass: 0.3 })

	const buttonRef = useRef<HTMLButtonElement>(null)
	const isToggling = useRef(false)

	// gentle sway when cursor moves near the cord
	const onHoverMove = useCallback(
		(ev: React.MouseEvent) => {
			if (isToggling.current || !buttonRef.current) {
				return
			}
			const rect = buttonRef.current.getBoundingClientRect()
			const centerX = rect.left + rect.width / 2
			const offset = (ev.clientX - centerX) / rect.width // -0.5 to 0.5
			cordRotate.set(offset * 5) // max ~2.5 degrees
		},
		[cordRotate],
	)

	const onHoverLeave = useCallback(() => {
		if (!isToggling.current) {
			cordRotate.set(0)
		}
	}, [cordRotate])

	function toggle() {
		isToggling.current = true
		// pull down with spring bounce
		cordLength.set(CORD_PULLED)
		setTimeout(() => cordLength.set(CORD_REST), 150)

		// swing the handle
		cordRotate.set(8)
		setTimeout(() => cordRotate.set(-5), 120)
		setTimeout(() => {
			cordRotate.set(0)
			isToggling.current = false
		}, 300)

		const next = preference === 'dark' ? 'light' : 'dark'

		// Radial view transition from the handle position
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- not all browsers implement View Transition API
		if (document.startViewTransition && handleRef.current) {
			const rect = handleRef.current.getBoundingClientRect()
			const x = rect.left + rect.width / 2
			const y = rect.top + rect.height / 2
			const radius = Math.hypot(
				Math.max(x, window.innerWidth - x),
				Math.max(y, window.innerHeight - y),
			)

			// Flag to suppress CSS wipe animation -- only radial WAAPI runs
			document.documentElement.classList.add('radial-transition')

			const transition = document.startViewTransition(() => {
				applyTheme(next)
			})

			void transition.ready.then(() => {
				document.documentElement.animate(
					{
						clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
					},
					{
						duration: 500,
						easing: 'ease-out',
						pseudoElement: '::view-transition-new(root)',
					},
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
	}

	return (
		<motion.button
			ref={buttonRef}
			type="button"
			onClick={toggle}
			onMouseMove={onHoverMove}
			onMouseLeave={onHoverLeave}
			className="group fixed top-0 right-6 z-50 flex cursor-pointer flex-col items-center border-none bg-transparent p-0 sm:right-8"
			aria-label={preference === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
			style={{ rotate: cordRotate, transformOrigin: 'top center' }}
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
