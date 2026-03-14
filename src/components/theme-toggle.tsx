import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { applyResolvedTheme, resolveTheme, setThemeCookie, type ThemePreference } from '~/lib/theme'

const cycle: ThemePreference[] = ['light', 'dark', 'system']

const icons: Record<ThemePreference, typeof Sun> = {
	light: Sun,
	dark: Moon,
	system: Monitor,
}

const labels: Record<ThemePreference, string> = {
	light: 'Light theme',
	dark: 'Dark theme',
	system: 'System theme',
}

const noopSubscribe = () => () => {}

function readPreference(): ThemePreference {
	const m = document.cookie.match(/\btheme=(light|dark|system)\b/)
	return (m?.[1] as ThemePreference) ?? 'system'
}

export function ThemeToggle() {
	// Server snapshot returns false; client returns true after hydration
	const mounted = useSyncExternalStore(
		noopSubscribe,
		() => true,
		() => false,
	)

	// Lazy init reads cookie on client; server always gets "system".
	// During hydration mounted=false so the placeholder renders either way — no mismatch.
	const [preference, setPreference] = useState<ThemePreference>(() => {
		if (typeof document === 'undefined') return 'system'
		return readPreference()
	})

	const applyPreference = useCallback((pref: ThemePreference) => {
		const resolved = resolveTheme(pref)
		applyResolvedTheme(resolved)
		setThemeCookie(pref)
		setPreference(pref)
	}, [])

	// Listen for OS theme changes when preference is "system"
	useEffect(() => {
		if (!mounted || preference !== 'system') return

		const mq = window.matchMedia('(prefers-color-scheme:dark)')

		function onChange(e: MediaQueryListEvent) {
			applyResolvedTheme(e.matches ? 'dark' : 'light')
		}

		// Apply current system value immediately
		applyResolvedTheme(mq.matches ? 'dark' : 'light')
		mq.addEventListener('change', onChange)
		return () => mq.removeEventListener('change', onChange)
	}, [mounted, preference])

	function toggle() {
		const idx = cycle.indexOf(preference)
		const next = cycle[(idx + 1) % cycle.length]
		applyPreference(next)
	}

	const Icon = icons[preference]

	return (
		<Button variant="ghost" size="icon" onClick={toggle} aria-label={labels[preference]}>
			{mounted ? <Icon className="size-4" /> : <span className="size-4" />}
		</Button>
	)
}
