import { useState, useSyncExternalStore } from 'react'
import { Moon, Sun } from 'lucide-react'
import { applyResolvedThemeWithTransition, setThemeCookie, type ThemePreference } from '~/lib/theme'

const noopSubscribe = () => () => {}

function readPreference(): ThemePreference {
	const m = document.cookie.match(/\btheme=(light|dark)\b/)
	if (m?.[1] === 'light' || m?.[1] === 'dark') return m[1]
	return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function FooterThemeToggle() {
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

	if (!mounted) return <span className="size-4" />

	const Icon = preference === 'dark' ? Moon : Sun
	const label = preference === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'

	return (
		<button
			type="button"
			onClick={toggle}
			className="text-content-tertiary hover:text-content-heading cursor-pointer border-none bg-transparent p-1 transition-colors"
			aria-label={label}
		>
			<Icon className="size-4" />
		</button>
	)
}

interface SiteFooterProps {
	settings: {
		siteTitle: string
		footerText: string
		copyright: string
	}
}

export function SiteFooter({ settings }: SiteFooterProps) {
	const year = new Date().getFullYear()

	return (
		<footer className="before:bg-border-default relative mt-16 before:absolute before:top-0 before:left-1/2 before:h-px before:w-screen before:-translate-x-1/2">
			<div className="mx-auto max-w-4xl px-5 py-10">
				<div className="flex items-start justify-between gap-8">
					{/* left: content */}
					<div className="space-y-3">
						<p className="text-content-heading text-sm font-medium">{settings.siteTitle}</p>
						<p className="text-content-tertiary max-w-sm text-xs leading-relaxed">
							{settings.footerText}
						</p>
						<p className="text-content-tertiary text-xs">
							&copy; {year} {settings.copyright}. All rights reserved.
						</p>
					</div>

					{/* right: theme toggle */}
					<div className="shrink-0 pt-1">
						<FooterThemeToggle />
					</div>
				</div>
			</div>
		</footer>
	)
}
