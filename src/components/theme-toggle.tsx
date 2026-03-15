import { useState, useSyncExternalStore } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { applyResolvedThemeWithTransition, setThemeCookie, type ThemePreference } from '~/lib/theme'

const icons: Record<ThemePreference, typeof Sun> = {
	light: Sun,
	dark: Moon,
}

const labels: Record<ThemePreference, string> = {
	light: 'Switch to dark theme',
	dark: 'Switch to light theme',
}

const noopSubscribe = () => () => {}

function readPreference(): ThemePreference {
	const m = document.cookie.match(/\btheme=(light|dark)\b/)
	if (m?.[1] === 'light' || m?.[1] === 'dark') return m[1]
	return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function ThemeToggle() {
	const mounted = useSyncExternalStore(
		noopSubscribe,
		() => true,
		() => false,
	)

	const [preference, setPreference] = useState<ThemePreference>(() => {
		if (typeof document === 'undefined') return 'light'
		return readPreference()
	})

	function toggle() {
		const next = preference === 'dark' ? 'light' : 'dark'
		applyResolvedThemeWithTransition(next)
		setThemeCookie(next)
		setPreference(next)
	}

	const Icon = icons[preference]

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={toggle}
			aria-label={mounted ? labels[preference] : 'Toggle theme'}
		>
			{mounted ? <Icon className="size-4" /> : <span className="size-4" />}
		</Button>
	)
}
