/* src/components/site-footer.tsx */

import { motion } from 'motion/react'
import { ArrowUpRight, Mail } from 'lucide-react'
import { useRef, useState } from 'react'
import { GitHub, Rss, Telegram, Twitter, YouTube } from '~/components/icons'
import { LiquidGlassOverlay } from '~/components/liquid-glass-overlay'
import { useSvgLiquidGlass } from '~/hooks/use-svg-liquid-glass'
import { useTheme } from '~/lib/theme'

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

const FOOTER_SOCIAL_LINKS = [
	{ color: '#1d9bf0', href: 'https://twitter.com', icon: Twitter, label: 'Twitter' },
	{ color: '#181717', href: 'https://github.com', icon: GitHub, label: 'GitHub' },
	{ color: '#ff0033', href: 'https://youtube.com', icon: YouTube, label: 'YouTube' },
	{ color: '#229ed9', href: 'https://telegram.org', icon: Telegram, label: 'Telegram' },
	{ color: '#F2A93C', href: 'mailto:owner@example.com', icon: Mail, label: 'Mail' },
	{ color: '#f97316', href: '/feed.xml', icon: Rss, label: 'RSS' },
] as const

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

function SocialGlassIcon({
	color,
	href,
	icon: Icon,
	label,
}: {
	color: string
	href: string
	icon: (typeof FOOTER_SOCIAL_LINKS)[number]['icon']
	label: string
}) {
	const ref = useRef<HTMLDivElement>(null)
	const theme = useTheme()
	const glass = useSvgLiquidGlass(ref, {
		radius: 18,
		bezelWidth: 8,
		glassThickness: 30,
		blur: 0,
		theme,
	})
	const isLarge = label === 'RSS' || label === 'Telegram'

	return (
		<a
			key={label}
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			aria-label={label}
			title={label}
			className="relative inline-flex size-9 items-center justify-center transition-transform duration-200 ease-out hover:scale-[1.025]"
		>
			{/* Layer 0: solid color circle */}
			<div className="absolute inset-0 rounded-full" style={{ backgroundColor: color }} />

			{/* Liquid glass overlay */}
			<div ref={ref} className="absolute inset-0 rounded-full">
				<LiquidGlassOverlay glass={glass} borderRadius="50%" />
			</div>

			{/* Layer 4: icon on top */}
			<Icon className={`relative z-10 text-white ${isLarge ? 'size-5' : 'size-4.5'}`} />
		</a>
	)
}

function FooterSocialLinks() {
	return (
		<div className="flex items-center gap-4">
			{FOOTER_SOCIAL_LINKS.map((item) => (
				<SocialGlassIcon
					key={item.label}
					color={item.color}
					href={item.href}
					icon={item.icon}
					label={item.label}
				/>
			))}
		</div>
	)
}

function FooterGlassMetaItem({
	compact = false,
	href,
	label,
	onHoverChange,
}: {
	compact?: boolean
	href?: string
	label: string
	onHoverChange?: (hovered: boolean) => void
}) {
	const [hovered, setHovered] = useState(false)
	const type = href ? linkType(href) : null
	const opensNew = type !== null && type !== 'internal'

	function updateHovered(next: boolean) {
		setHovered(next)
		onHoverChange?.(next)
	}

	const content = (
		<>
			<motion.span
				className="text-content-tertiary relative z-20 inline-flex items-center whitespace-nowrap"
				initial={false}
				animate={{ x: hovered && !compact ? -1.5 : 0 }}
				transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.55 }}
			>
				<span>{label}</span>
				<motion.span
					aria-hidden="true"
					className="absolute inset-x-0 bottom-px h-px origin-left"
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
				className={`relative inline-flex items-center rounded-xl text-[13px] no-underline ${
					compact ? 'px-0 py-0.5' : 'px-2 py-1'
				}`}
				onBlur={() => updateHovered(false)}
				onFocus={() => updateHovered(true)}
				onMouseEnter={() => updateHovered(true)}
				onMouseLeave={() => updateHovered(false)}
			>
				{content}
			</a>
		)
	}

	return (
		<span
			className={`relative inline-flex items-center rounded-xl text-[13px] ${
				compact ? 'px-0 py-0.5' : 'px-2 py-1'
			}`}
			onMouseEnter={() => updateHovered(true)}
			onMouseLeave={() => updateHovered(false)}
		>
			{content}
		</span>
	)
}

function FooterPoweredBy() {
	const [hovered, setHovered] = useState(false)

	return (
		<motion.div
			className="text-content-tertiary flex items-center gap-0.5"
			initial={false}
			animate={{ x: hovered ? -4 : 0 }}
			transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.55 }}
		>
			<span>Powered by</span>
			<FooterGlassMetaItem
				compact
				href="https://github.com/canmi21/taki"
				label="Taki"
				onHoverChange={setHovered}
			/>
		</motion.div>
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
	timezone?: string
	siteConfig: {
		copyright: string
		createdAt: string
		footerDescription: string
		footerName: string
		footerNav: string
		icp: string
		icpLink: string
	}
}

const FOOTER_GLASS_OVERFLOW = 40

function formatCopyrightYears(createdAt: string, timezone?: string): string {
	const startYear = new Date(createdAt).getUTCFullYear()
	let currentYear: number
	try {
		if (timezone) {
			currentYear = Number(
				new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric' }).format(),
			)
		} else {
			currentYear = new Date().getFullYear()
		}
	} catch {
		currentYear = new Date().getFullYear()
	}
	return startYear === currentYear
		? String(startYear)
		: `${String(startYear)}\u2013${String(currentYear)}`
}

export function SiteFooter({ siteConfig, timezone }: SiteFooterProps) {
	const navColumns = parseNavColumns(siteConfig.footerNav)
	const theme = useTheme()
	const glassRef = useRef<HTMLDivElement>(null)
	const glass = useSvgLiquidGlass(glassRef, { radius: 30, blur: 0, theme })

	return (
		<footer className="relative mt-16">
			<div className="relative isolate overflow-hidden">
				{/* Liquid glass element: extends past bottom and sides, clipped by overflow:hidden */}
				<div
					ref={glassRef}
					className="pointer-events-none absolute z-10"
					style={{
						top: 0,
						left: 0,
						right: 0,
						bottom: -FOOTER_GLASS_OVERFLOW,
						borderRadius: '30px 30px 0 0',
					}}
				>
					<LiquidGlassOverlay
						glass={glass}
						borderRadius="30px 30px 0 0"
						background="var(--footer-glass-bg)"
					/>
				</div>

				<div className="mx-auto max-w-6xl px-5 py-10">
					<div className="flex flex-col justify-between gap-10 sm:flex-row sm:items-stretch">
						<div className="relative z-20 flex max-w-sm flex-col">
							<div className="space-y-2 pt-3">
								<p className="text-content-heading text-[15px] font-medium">
									{siteConfig.footerName}
								</p>
								<p className="text-content-tertiary max-w-xs text-[14px] leading-relaxed">
									{siteConfig.footerDescription}
								</p>
							</div>

							<div className="flex flex-1 items-center pt-4 sm:max-w-xs">
								<FooterSocialLinks />
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

					<div className="flex items-center justify-between gap-4">
						<div className="relative z-20 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
							<div className="flex items-center gap-2">
								<span
									aria-hidden="true"
									className="inline-flex size-2 rounded-full"
									style={{ backgroundColor: '#16a34a' }}
								/>
								<p className="text-content-heading font-medium">All systems normal.</p>
							</div>
							<p className="text-content-tertiary font-medium">
								&copy; {formatCopyrightYears(siteConfig.createdAt, timezone)} {siteConfig.copyright}
							</p>
							<FooterPoweredBy />
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
