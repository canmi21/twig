/* src/components/site-footer.tsx */

import { useState } from 'react'
import { ArrowUpRight, Moon, Sun } from 'lucide-react'
import { applyResolvedThemeWithTransition, setThemeCookie } from '~/lib/theme'
import type { ThemePreference } from '~/lib/theme'

interface NavLink {
	label: string
	href: string
}

interface NavColumn {
	title: string
	links: NavLink[]
}

/** Classify a link href for rendering behavior. */
function linkType(href: string): 'internal' | 'external' | 'special' {
	if (href.startsWith('/')) {
		return 'internal'
	}
	if (href.startsWith('http://') || href.startsWith('https://')) {
		return 'external'
	}
	return 'special'
}

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

function FooterLink({ href, label }: NavLink) {
	const type = linkType(href)
	const isExternal = type === 'external'
	const opensNew = type !== 'internal'

	return (
		<a
			href={href}
			target={opensNew ? '_blank' : undefined}
			rel={opensNew ? 'noopener noreferrer' : undefined}
			className="text-content-heading after:bg-primary/70 relative inline-flex items-center gap-1 px-1.5 py-0.5 text-[13px] no-underline after:absolute after:inset-x-0 after:bottom-0 after:h-[40%] after:rounded-sm after:opacity-0 after:transition-opacity after:duration-200 hover:after:opacity-100"
		>
			{label}
			{isExternal && <ArrowUpRight className="size-[11px]" />}
		</a>
	)
}

function parseNavColumns(json: string): NavColumn[] {
	try {
		return JSON.parse(json) as NavColumn[]
	} catch {
		return []
	}
}

interface SiteFooterProps {
	initialTheme: ThemePreference
	siteConfig: {
		copyright: string
		footerDescription: string
		footerName: string
		footerNav: string
		icp: string
		icpLink: string
		url: string
	}
}

export function SiteFooter({ siteConfig, initialTheme }: SiteFooterProps) {
	const navColumns = parseNavColumns(siteConfig.footerNav)

	return (
		<footer className="bg-surface/60 before:bg-border-default relative mt-16 backdrop-blur-md before:absolute before:top-0 before:left-1/2 before:h-px before:w-screen before:-translate-x-1/2">
			<div className="mx-auto max-w-6xl px-5 py-10">
				{/* Top section */}
				<div className="flex flex-col justify-between gap-10 sm:flex-row">
					{/* Left: branding */}
					<div className="space-y-2">
						<p className="text-content-heading text-sm font-medium">{siteConfig.footerName}</p>
						<p className="text-content-tertiary max-w-xs text-[13px] leading-relaxed">
							{siteConfig.footerDescription}
						</p>
						<div className="space-y-1.5 pt-5">
							<p className="text-content-tertiary text-[13px]">&copy; {siteConfig.copyright}</p>
							<p className="text-content-tertiary text-[13px]">
								Powered by{' '}
								<a
									href="https://github.com/canmi21/taki"
									target="_blank"
									rel="noopener noreferrer"
									className="text-content-secondary hover:text-content-heading transition-colors"
								>
									Taki
								</a>
							</p>
						</div>
					</div>

					{/* Right: nav columns */}
					{navColumns.length > 0 && (
						<div className="flex gap-16">
							{navColumns.map((col) => (
								<ul key={col.title} className="m-0 list-none space-y-1 p-0">
									<li className="text-content-tertiary px-1.5 py-0.5 text-[13px] font-semibold">
										{col.title}
									</li>
									{col.links.map((link) => (
										<li key={link.label}>
											<FooterLink href={link.href} label={link.label} />
										</li>
									))}
								</ul>
							))}
						</div>
					)}
				</div>

				{/* Divider */}
				<div className="bg-border-subtle my-6 h-px" />

				{/* Bottom section */}
				<div className="flex items-center justify-between">
					{/* Bottom left: RSS, Sitemap, theme toggle */}
					<div className="flex items-center gap-3">
						<a
							href="/feed.xml"
							target="_blank"
							rel="noopener noreferrer"
							className="text-content-tertiary hover:text-content-heading text-[13px] no-underline transition-colors"
						>
							RSS
						</a>
						<a
							href={`view-source:${siteConfig.url}/sitemap.xml`}
							target="_blank"
							rel="noopener noreferrer"
							className="text-content-tertiary hover:text-content-heading text-[13px] no-underline transition-colors"
						>
							Sitemap
						</a>
						<FooterThemeToggle initialTheme={initialTheme} />
					</div>

					{/* Bottom right: ICP */}
					{siteConfig.icp &&
						(siteConfig.icpLink ? (
							<a
								href={siteConfig.icpLink}
								target="_blank"
								rel="noopener noreferrer"
								className="text-content-tertiary hover:text-content-heading text-[13px] no-underline transition-colors"
							>
								{siteConfig.icp}
							</a>
						) : (
							<p className="text-content-tertiary text-[13px]">{siteConfig.icp}</p>
						))}
				</div>
			</div>
		</footer>
	)
}
