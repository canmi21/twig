import { useState, useEffect, useRef } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
	getTimelineCursor,
	type CursorTimeline,
	type TimelineItem,
} from '~/server/functions/content'
import { getPlatformStatus } from '~/server/functions/health'
import { groupByYearMonth, buildAnchorMap, itemDateKey } from '~/lib/timeline'
import { TimelineMonth } from '~/components/timeline-month'
import { SiteFooter } from '~/components/site-footer'

export const Route = createFileRoute('/')({
	validateSearch: (search: Record<string, unknown>) => ({
		at: typeof search.at === 'string' ? search.at : undefined,
	}),
	loaderDeps: () => ({}),
	shouldReload: false,
	loader: async ({ location }): Promise<CursorTimeline> => {
		const at = (location.search as { at?: string }).at
		await getPlatformStatus()
		return await getTimelineCursor({
			data: at ? { until: at } : {},
		})
	},
	component: TimelinePage,
})

function silentReplaceUrl(routerHistory: { _ignoreSubscribers?: boolean }, url: string) {
	const h = routerHistory as { _ignoreSubscribers?: boolean }
	h._ignoreSubscribers = true
	window.history.replaceState(null, '', url)
	h._ignoreSubscribers = false
}

function anchorToUrl(anchor: string): string {
	const [dateKey, idx] = anchor.split('#')
	return idx === '1' ? `/?at=${dateKey}` : `/?at=${dateKey}#${idx}`
}

function TimelinePage() {
	const initial = Route.useLoaderData()
	const { at } = Route.useSearch()
	const router = useRouter()
	const [items, setItems] = useState<TimelineItem[]>(initial.items)
	const [cursor, setCursor] = useState<string | null>(initial.nextCursor)
	const [loading, setLoading] = useState(false)
	const currentAnchorRef = useRef<string>('')
	const routerHistoryRef = useRef(router.history)
	routerHistoryRef.current = router.history

	// ratchet footer: tracks which item index the footer sits after (only increases)
	const [ratchetIndex, setRatchetIndex] = useState(initial.items.length)

	const anchorMap = buildAnchorMap(items)

	// scroll to fragment target on mount (once)
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

	// anchor tracking: observe all [data-anchor] elements for scroll-based URL updates
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

	// ratchet: observe the first post-ratchet item, advance when fully visible
	useEffect(() => {
		if (typeof window === 'undefined' || ratchetIndex >= items.length) return

		const postItem = items[ratchetIndex]
		const el = document.querySelector(
			`[data-anchor="${anchorMap.get(postItem.id)?.dateKey}#${anchorMap.get(postItem.id)?.index}"]`,
		)
		if (!el) return

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setRatchetIndex((prev) => prev + 1)
				}
			},
			{ threshold: 0.8, rootMargin: '-80px 0px 0px 0px' },
		)

		observer.observe(el)
		return () => observer.disconnect()
	}, [ratchetIndex, items, anchorMap])

	// auto-load when ratchet approaches end of loaded items
	const cursorRef = useRef(cursor)
	cursorRef.current = cursor
	const loadingRef = useRef(loading)
	loadingRef.current = loading
	const itemsLenRef = useRef(items.length)
	itemsLenRef.current = items.length

	async function loadMore() {
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

	const loadMoreRef = useRef(loadMore)
	loadMoreRef.current = loadMore

	useEffect(() => {
		if (itemsLenRef.current - ratchetIndex <= 3 && cursorRef.current && !loadingRef.current) {
			void loadMoreRef.current()
		}
	}, [ratchetIndex])

	// split items at ratchet point
	const preItems = items.slice(0, ratchetIndex)
	const postItems = items.slice(ratchetIndex)
	const preGroups = groupByYearMonth(preItems)
	const postGroups = groupByYearMonth(postItems)

	// check if post-ratchet section continues the same month
	const lastPreMonth =
		preItems.length > 0 ? itemDateKey(preItems[preItems.length - 1]).slice(0, 7) : null
	const firstPostMonth = postItems.length > 0 ? itemDateKey(postItems[0]).slice(0, 7) : null
	const postContinuesSameMonth = lastPreMonth === firstPostMonth

	return (
		<section>
			{/* pre-ratchet: confirmed-seen items */}
			<TimelineSection yearGroups={preGroups} anchorMap={anchorMap} atDate={at} isFirst />

			{/* ratchet footer */}
			<SiteFooter />

			{/* post-ratchet: items below footer */}
			{postItems.length > 0 && (
				<TimelineSection
					yearGroups={postGroups}
					anchorMap={anchorMap}
					atDate={at}
					hideFirstHeader={postContinuesSameMonth}
				/>
			)}

			{items.length === 0 && (
				<p className="text-content-secondary py-12 text-center">No content found.</p>
			)}

			{loading && <p className="text-content-tertiary py-4 text-center text-sm">Loading...</p>}
		</section>
	)
}

/** Renders year/month grouped timeline sections */
function TimelineSection({
	yearGroups,
	anchorMap,
	atDate,
	isFirst = false,
	hideFirstHeader = false,
}: {
	yearGroups: ReturnType<typeof groupByYearMonth>
	anchorMap: Map<string, { dateKey: string; index: number }>
	atDate?: string
	isFirst?: boolean
	hideFirstHeader?: boolean
}) {
	return (
		<>
			{yearGroups.map((yearGroup, yi) => (
				<div key={yearGroup.year}>
					<div className="space-y-10">
						{yearGroup.months.map((mg, mi) => {
							const isAbsoluteFirst = isFirst && yi === 0 && mi === 0
							const shouldHide = isAbsoluteFirst || (hideFirstHeader && yi === 0 && mi === 0)

							return (
								<TimelineMonth
									key={mg.monthKey}
									monthKey={mg.monthKey}
									items={mg.items}
									hideHeader={shouldHide}
									yearLabel={mi === 0 && yi > 0 ? yearGroup.year : undefined}
									anchorMap={anchorMap}
									atDate={atDate}
								/>
							)
						})}
					</div>
				</div>
			))}
		</>
	)
}
