/* src/components/site-footer.tsx */

import { motion } from 'motion/react'
import { ArrowUpRight, Moon, Sun } from 'lucide-react'
import { useRef, useState } from 'react'
import { applyResolvedThemeWithTransition, setThemeCookie, useTheme } from '~/lib/theme'

interface NavLink {
	label: string
	href: string
}

interface NavColumn {
	title: string
	links: NavLink[]
}

interface HoverRect {
	height: number
	left: number
	top: number
	width: number
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

function FooterThemeToggle() {
	const preference = useTheme()

	function toggle() {
		const next = preference === 'dark' ? 'light' : 'dark'
		applyResolvedThemeWithTransition(next)
		setThemeCookie(next)
	}

	const Icon = preference === 'dark' ? Moon : Sun
	const label = preference === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'

	return (
		<button
			type="button"
			onClick={toggle}
			className="text-content-tertiary hover:text-content-heading cursor-pointer rounded-md border-none bg-transparent p-1 transition-colors"
			aria-label={label}
		>
			<Icon className="size-4" />
		</button>
	)
}

function FooterLink({
	href,
	label,
	tone = 'primary',
}: NavLink & { tone?: 'primary' | 'secondary' }) {
	const type = linkType(href)
	const isExternal = type === 'external'
	const opensNew = type !== 'internal'

	return (
		<a
			href={href}
			target={opensNew ? '_blank' : undefined}
			rel={opensNew ? 'noopener noreferrer' : undefined}
			className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[13px] no-underline transition-colors ${
				tone === 'primary'
					? 'text-content-heading hover:text-content-secondary'
					: 'text-content-tertiary hover:text-content-heading'
			}`}
		>
			<span>{label}</span>
			{isExternal ? <ArrowUpRight className="size-2.75" /> : null}
		</a>
	)
}

function FooterGlassMetaItem({ href, label }: { href?: string; label: string }) {
	const [hovered, setHovered] = useState(false)
	const type = href ? linkType(href) : null
	const opensNew = type !== null && type !== 'internal'

	const content = (
		<>
			<motion.span
				className="text-content-tertiary relative z-20 inline-flex items-center whitespace-nowrap"
				initial={false}
				animate={{ x: 0 }}
				transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.55 }}
			>
				<span>{label}</span>
				<motion.span
					aria-hidden="true"
					className="absolute inset-x-0 -bottom-0.5 h-px origin-left"
					initial={false}
					animate={{
						opacity: hovered ? 1 : 0,
						scaleX: hovered ? 1 : 0.2,
						y: hovered ? 0 : -2,
					}}
					transition={{
						opacity: { duration: 0.12 },
						scaleX: { type: 'spring', stiffness: 500, damping: 34, mass: 0.45 },
						y: { type: 'spring', stiffness: 420, damping: 30, mass: 0.45 },
					}}
					style={{ backgroundColor: 'var(--text-tertiary)' }}
				/>
			</motion.span>
			<motion.span
				aria-hidden="true"
				className="text-content-tertiary relative z-20 inline-flex items-center overflow-hidden"
				initial={false}
				animate={{
					marginLeft: hovered ? 1 : 0,
					opacity: hovered ? 1 : 0,
					width: hovered ? 11 : 0,
					x: hovered ? 0 : 1,
				}}
				transition={{
					marginLeft: { type: 'spring', stiffness: 420, damping: 30, mass: 0.5 },
					opacity: { duration: 0.14 },
					width: { type: 'spring', stiffness: 420, damping: 30, mass: 0.5 },
					x: { type: 'spring', stiffness: 420, damping: 28, mass: 0.5 },
				}}
			>
				<ArrowUpRight className="size-2.75" />
			</motion.span>
		</>
	)

	if (href) {
		return (
			<a
				href={href}
				target={opensNew ? '_blank' : undefined}
				rel={opensNew ? 'noopener noreferrer' : undefined}
				className="relative inline-flex items-center rounded-xl px-2 py-1 text-[13px] no-underline"
				onBlur={() => setHovered(false)}
				onFocus={() => setHovered(true)}
				onMouseEnter={() => setHovered(true)}
				onMouseLeave={() => setHovered(false)}
			>
				{content}
			</a>
		)
	}

	return (
		<span
			className="relative inline-flex items-center rounded-xl px-2 py-1 text-[13px]"
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
		>
			{content}
		</span>
	)
}

function FooterNavColumnGroup({ links, title }: NavColumn) {
	const wrapperRef = useRef<HTMLDivElement>(null)
	const [hoveredHref, setHoveredHref] = useState<string | null>(null)
	const [hoverRect, setHoverRect] = useState<HoverRect | null>(null)

	function handleHover(href: string, el: HTMLElement) {
		const wrapper = wrapperRef.current
		if (!wrapper) {
			return
		}

		const wrapperRect = wrapper.getBoundingClientRect()
		const linkRect = el.getBoundingClientRect()

		setHoveredHref(href)
		setHoverRect({
			height: linkRect.height,
			left: linkRect.left - wrapperRect.left,
			top: linkRect.top - wrapperRect.top,
			width: linkRect.width,
		})
	}

	return (
		<div
			className="relative"
			ref={wrapperRef}
			onBlurCapture={() => setHoveredHref(null)}
			onMouseLeave={() => setHoveredHref(null)}
		>
			<div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-2xl">
				<motion.div
					className="absolute rounded-xl"
					initial={false}
					animate={{
						height: hoverRect?.height ?? 0,
						left: hoverRect?.left ?? 0,
						opacity: hoveredHref ? 1 : 0,
						top: hoverRect?.top ?? 0,
						width: hoverRect?.width ?? 0,
					}}
					transition={{
						height: { type: 'spring', stiffness: 420, damping: 34, mass: 0.5 },
						left: { type: 'spring', stiffness: 420, damping: 34, mass: 0.5 },
						opacity: { duration: 0.16 },
						top: { type: 'spring', stiffness: 420, damping: 34, mass: 0.5 },
						width: { type: 'spring', stiffness: 420, damping: 34, mass: 0.5 },
					}}
				>
					<span
						className="absolute inset-0 rounded-xl opacity-80 blur-sm"
						style={{
							background:
								'linear-gradient(90deg, color-mix(in oklch, var(--accent) 8%, transparent) 0%, color-mix(in oklch, var(--accent) 28%, white 6%) 50%, color-mix(in oklch, var(--accent) 8%, transparent) 100%)',
						}}
					/>
					<span
						className="absolute inset-x-3 bottom-1.5 h-px rounded-full"
						style={{
							background:
								'linear-gradient(90deg, transparent 0%, color-mix(in oklch, var(--accent) 18%, transparent) 10%, color-mix(in oklch, var(--accent) 92%, white 18%) 50%, color-mix(in oklch, var(--accent) 18%, transparent) 90%, transparent 100%)',
						}}
					/>
				</motion.div>
			</div>

			<div className="relative z-20 p-2">
				<p className="text-content-tertiary px-2 py-1 text-[13px] font-bold">{title}</p>
				<ul className="m-0 list-none space-y-1 p-0">
					{links.map((link) => {
						const type = linkType(link.href)
						const isExternal = type === 'external'
						const opensNew = type !== 'internal'

						return (
							<li key={link.label}>
								<a
									href={link.href}
									target={opensNew ? '_blank' : undefined}
									rel={opensNew ? 'noopener noreferrer' : undefined}
									className="group relative flex items-center justify-between rounded-xl px-2 py-1.5 text-[13px] no-underline transition-colors"
									onFocus={(e) => handleHover(link.href, e.currentTarget)}
									onMouseEnter={(e) => handleHover(link.href, e.currentTarget)}
								>
									<span
										className={
											hoveredHref === link.href
												? 'text-accent relative z-10'
												: 'text-content-heading group-hover:text-accent relative z-10 transition-colors'
										}
									>
										{link.label}
									</span>
									{isExternal ? (
										<ArrowUpRight
											className={
												hoveredHref === link.href
													? 'text-accent relative z-10 size-2.75'
													: 'text-content-heading group-hover:text-accent relative z-10 size-2.75 transition-colors'
											}
										/>
									) : null}
								</a>
							</li>
						)
					})}
				</ul>
			</div>
		</div>
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

export function SiteFooter({ siteConfig }: SiteFooterProps) {
	const navColumns = parseNavColumns(siteConfig.footerNav)

	return (
		<footer className="relative mt-16">
			<div className="relative isolate overflow-hidden">
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 z-10 border shadow-(--shadow-md) backdrop-blur-md"
					style={{
						backgroundColor: 'var(--footer-glass-bg)',
						borderColor: 'var(--footer-glass-border)',
					}}
				/>
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px"
					style={{ backgroundColor: 'var(--footer-glass-edge)' }}
				/>

				<div className="mx-auto max-w-6xl px-5 py-10">
					<div className="flex flex-col justify-between gap-10 sm:flex-row">
						<div className="relative z-20 space-y-2">
							<p className="text-content-heading text-sm font-medium">{siteConfig.footerName}</p>
							<p className="text-content-tertiary max-w-xs text-[13px] leading-relaxed">
								{siteConfig.footerDescription}
							</p>
							<div className="space-y-1.5 pt-5">
								<p className="text-content-tertiary text-[13px]">&copy; {siteConfig.copyright}</p>
								<p className="text-content-tertiary text-[13px]">
									Powered by{' '}
									<FooterLink
										href="https://github.com/canmi21/taki"
										label="Taki"
										tone="secondary"
									/>
								</p>
							</div>
						</div>

						{navColumns.length > 0 && (
							<div className="flex gap-6">
								{navColumns.map((col) => (
									<FooterNavColumnGroup key={col.title} links={col.links} title={col.title} />
								))}
							</div>
						)}
					</div>

					<div className="bg-border-subtle relative z-20 my-6 h-px" />

					<div className="flex items-center justify-between">
						<div className="relative z-20 flex items-center gap-3">
							<FooterLink href="/feed.xml" label="RSS" tone="secondary" />
							<FooterLink
								href={`view-source:${siteConfig.url}/sitemap.xml`}
								label="Sitemap"
								tone="secondary"
							/>
							<FooterThemeToggle />
						</div>

						{siteConfig.icp &&
							(siteConfig.icpLink ? (
								<FooterGlassMetaItem href={siteConfig.icpLink} label={siteConfig.icp} />
							) : (
								<FooterGlassMetaItem label={siteConfig.icp} />
							))}
					</div>
				</div>
			</div>
		</footer>
	)
}
