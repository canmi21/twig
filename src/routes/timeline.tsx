import { useState, useEffect, useRef } from 'react'
import { createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'
import {
	getTimelineCursor,
	type CursorTimeline,
	type TimelineItem,
} from '~/server/functions/content'
import { getPlatformStatus } from '~/server/functions/health'
import { groupByYearMonth, buildAnchorMap, itemDateKey } from '~/lib/timeline'
import { TimelineMonth } from '~/components/timeline-month'
import { SiteFooter } from '~/components/site-footer'

export const Route = createFileRoute('/timeline')({
	validateSearch: (search: Record<string, unknown>) => ({
		at: typeof search.at === 'string' ? search.at : undefined,
	}),
	loaderDeps: () => ({}),
	shouldReload: true,
	loader: async ({ location }): Promise<CursorTimeline> => {
		const at = (location.search as { at?: string }).at
		await getPlatformStatus()
		return await getTimelineCursor({
			data: at ? { until: at } : {},
		})
	},
	component: FullTimelinePage,
})

function silentReplaceUrl(routerHistory: { _ignoreSubscribers?: boolean }, url: string) {
	const h = routerHistory as { _ignoreSubscribers?: boolean }
	h._ignoreSubscribers = true
	window.history.replaceState(null, '', url)
	h._ignoreSubscribers = false
}

function anchorToUrl(anchor: string): string {
	const [dateKey, idx] = anchor.split('#')
	return idx === '1' ? `/timeline?at=${dateKey}` : `/timeline?at=${dateKey}#${idx}`
}

const rootApi = getRouteApi('__root__')

function FullTimelinePage() {
	const initial = Route.useLoaderData()
	const { settings } = rootApi.useLoaderData()
	const { at } = Route.useSearch()
	const router = useRouter()
	const [items, setItems] = useState<TimelineItem[]>(initial.items)
	const [cursor, setCursor] = useState<string | null>(initial.nextCursor)
	const [loading, setLoading] = useState(false)
	const currentAnchorRef = useRef<string>('')
	const routerHistoryRef = useRef(router.history)
	routerHistoryRef.current = router.history

	const anchorMap = buildAnchorMap(items)

	// scroll to fragment on mount (once)
	const scrolledRef = useRef(false)
	useEffect(() => {
		if (scrolledRef.current || !at) return
		scrolledRef.current = true

		const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : ''
		const targetIndex = Math.max(1, Number.parseInt(hash, 10) || 1)
		const dayItems = items.filter((item) => itemDateKey(item) === at)
		if (dayItems.length === 0) return

		const clampedIndex = Math.min(targetIndex, dayItems.length)
		const el = document.getElementById(`at-${clampedIndex}`)
		if (el) {
			requestAnimationFrame(() => el.scrollIntoView({ behavior: 'instant', block: 'start' }))
		}
	}, [at, items])

	// anchor tracking for URL updates
	useEffect(() => {
		if (typeof window === 'undefined') return

		let debounceTimer: ReturnType<typeof setTimeout> | null = null
		const observer = new IntersectionObserver(
			(entries) => {
				let topEntry: IntersectionObserverEntry | null = null
				for (const entry of entries) {
					if (!entry.isIntersecting) continue
					if (!topEntry || entry.boundingClientRect.top < topEntry.boundingClientRect.top) {
						topEntry = entry
					}
				}
				if (!topEntry) return

				const anchor = topEntry.target.getAttribute('data-anchor')
				if (!anchor || anchor === currentAnchorRef.current) return
				currentAnchorRef.current = anchor

				if (debounceTimer) clearTimeout(debounceTimer)
				debounceTimer = setTimeout(() => {
					silentReplaceUrl(routerHistoryRef.current, anchorToUrl(anchor))
				}, 210)
			},
			{ rootMargin: '-80px 0px -70% 0px' },
		)

		for (const el of document.querySelectorAll('[data-anchor]')) {
			observer.observe(el)
		}

		return () => {
			observer.disconnect()
			if (debounceTimer) clearTimeout(debounceTimer)
		}
	}, [items])

	// auto-load: observe a sentinel near the bottom
	const sentinelRef = useRef<HTMLDivElement>(null)
	const cursorRef = useRef(cursor)
	cursorRef.current = cursor
	const loadingRef = useRef(loading)
	loadingRef.current = loading

	useEffect(() => {
		if (typeof window === 'undefined' || !sentinelRef.current) return

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && cursorRef.current && !loadingRef.current) {
					void doLoadMore()
				}
			},
			{ rootMargin: '0px 0px 200px 0px' },
		)

		observer.observe(sentinelRef.current)
		return () => observer.disconnect()
	}, [items, cursor])

	async function doLoadMore() {
		if (!cursorRef.current || loadingRef.current) return
		setLoading(true)
		try {
			const result: CursorTimeline = await getTimelineCursor({
				data: { cursor: cursorRef.current },
			})
			setItems((prev) => [...prev, ...result.items])
			setCursor(result.nextCursor)
		} finally {
			setLoading(false)
		}
	}

	const yearGroups = groupByYearMonth(items)

	return (
		<section>
			{yearGroups.map((yearGroup, yi) => (
				<div key={yearGroup.year}>
					<div className="space-y-10">
						{yearGroup.months.map((mg, mi) => (
							<TimelineMonth
								key={mg.monthKey}
								monthKey={mg.monthKey}
								items={mg.items}
								hideHeader={yi === 0 && mi === 0}
								yearLabel={mi === 0 && yi > 0 ? yearGroup.year : undefined}
								anchorMap={anchorMap}
								atDate={at}
							/>
						))}
					</div>
				</div>
			))}

			{items.length === 0 && (
				<p className="text-content-secondary py-12 text-center">No content found.</p>
			)}

			{cursor && <div ref={sentinelRef} className="h-px" />}

			{loading && <p className="text-content-tertiary py-4 text-center text-sm">Loading...</p>}

			{!cursor && items.length > 0 && <SiteFooter settings={settings} />}
		</section>
	)
}
