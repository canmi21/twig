/* src/components/lamp-cord-toggle.tsx */

import { useRef, useState } from 'react'
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

export function LampCordToggle({ initialTheme }: { initialTheme: ThemePreference }) {
	const [preference, setPreference] = useState<ThemePreference>(() => {
		if (typeof document === 'undefined') {
			return initialTheme
		}
		return readPreference()
	})

	const [pulled, setPulled] = useState(false)
	const handleRef = useRef<HTMLDivElement>(null)

	function toggle() {
		setPulled(true)
		setTimeout(() => setPulled(false), 250)

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
		<button
			type="button"
			onClick={toggle}
			className="group fixed top-0 right-6 z-50 flex cursor-pointer flex-col items-center border-none bg-transparent p-0 sm:right-8"
			aria-label={preference === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
		>
			{/* Cord */}
			<div
				className="bg-border-strong w-px transition-all duration-250 ease-out"
				style={{ height: pulled ? '5.5rem' : '4rem' }}
			/>
			{/* Handle */}
			<div
				ref={handleRef}
				className="bg-content-tertiary group-hover:bg-primary h-5 w-2 rounded-full transition-colors"
			/>
		</button>
	)
}