import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { applyResolvedThemeWithTransition, setThemeCookie } from '~/lib/theme'
import type { ThemePreference } from '~/lib/theme'

function readPreference(): ThemePreference {
	const m = document.cookie.match(/\btheme=(light|dark)\b/)
	if (m?.[1] === 'light' || m?.[1] === 'dark') {
		return m[1]
	}
	return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function FooterThemeToggle({ initialTheme }: { initialTheme: ThemePreference }) {
	const [preference, setPreference] = useState<ThemePreference>(() => {
		if (typeof document === 'undefined') {
			return initialTheme
		}
		return readPreference()
	})

	function toggle() {
		const next = preference === 'dark' ? 'light' : 'dark'
		applyResolvedThemeWithTransition(next)
		setThemeCookie(next)
		setPreference(next)
	}

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
	initialTheme: ThemePreference
	siteConfig: {
		title: string
		description: string
	}
}

export function SiteFooter({ siteConfig, initialTheme }: SiteFooterProps) {
	const year = new Date().getFullYear()

	return (
		<footer className="before:bg-border-default relative mt-16 before:absolute before:top-0 before:left-1/2 before:h-px before:w-screen before:-translate-x-1/2">
			<div className="mx-auto max-w-4xl px-5 py-10">
				<div className="flex items-start justify-between gap-8">
					{/* Left: content */}
					<div className="space-y-3">
						<p className="text-content-heading text-sm font-medium">{siteConfig.title}</p>
						<p className="text-content-tertiary max-w-sm text-xs leading-relaxed">
							{siteConfig.description}
						</p>
						<p className="text-content-tertiary text-xs">
							&copy; {year} {siteConfig.title}. All rights reserved.
						</p>
					</div>

					{/* Right: theme toggle */}
					<div className="shrink-0 pt-1">
						<FooterThemeToggle initialTheme={initialTheme} />
					</div>
				</div>
			</div>
		</footer>
	)
}
