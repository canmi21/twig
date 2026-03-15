import { useState, useSyncExternalStore } from 'react'
import { setThemeCookie, type ThemePreference } from '~/lib/theme'

const noopSubscribe = () => () => {}

function readPreference(): ThemePreference {
	const m = document.cookie.match(/\btheme=(light|dark)\b/)
	if (m?.[1] === 'light' || m?.[1] === 'dark') return m[1]
	return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

/** Instant theme switch -- no view transition, like a physical pull cord */
function applyInstant(resolved: ThemePreference) {
	document.documentElement.classList.toggle('dark', resolved === 'dark')
	document.documentElement.style.colorScheme = resolved
}

export function LampCordToggle() {
	const mounted = useSyncExternalStore(
		noopSubscribe,
		() => true,
		() => false,
	)

	const [preference, setPreference] = useState<ThemePreference>(() => {
		if (typeof document === 'undefined') return 'light'
		return readPreference()
	})

	const [pulled, setPulled] = useState(false)

	function toggle() {
		setPulled(true)
		setTimeout(() => setPulled(false), 250)

		const next = preference === 'dark' ? 'light' : 'dark'
		applyInstant(next)
		setThemeCookie(next)
		setPreference(next)
	}

	if (!mounted) return null

	return (
		<button
			type="button"
			onClick={toggle}
			className="group fixed top-0 right-6 z-50 flex cursor-pointer flex-col items-center border-none bg-transparent p-0 sm:right-8"
			aria-label={preference === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
		>
			{/* cord */}
			<div
				className="bg-border-strong w-px transition-all duration-250 ease-out"
				style={{ height: pulled ? '5.5rem' : '4rem' }}
			/>
			{/* chain ring */}
			<div className="border-border-strong -mt-px size-2 rounded-full border" />
			{/* pendant handle -- capsule shape */}
			<div className="bg-content-tertiary group-hover:bg-primary mt-0.5 h-5 w-2 rounded-full transition-colors" />
		</button>
	)
}
