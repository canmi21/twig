import { useState, useEffect, useRef, useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
	getTimelineCursor,
	type CursorTimeline,
	type TimelineItem,
} from '~/server/functions/content'
import { getPlatformStatus } from '~/server/functions/health'
import { groupByYearMonth, buildAnchorMap } from '~/lib/timeline'
import { TimelineMonth } from '~/components/timeline-month'

export const Route = createFileRoute('/')({
	validateSearch: (search: Record<string, unknown>) => ({
		at: typeof search.at === 'string' ? search.at : undefined,
	}),
	// empty loaderDeps -- search param changes keep the same match ID
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

function TimelinePage() {
	const initial = Route.useLoaderData()
	const { at } = Route.useSearch()
	const [items, setItems] = useState<TimelineItem[]>(initial.items)
	const [cursor, setCursor] = useState<string | null>(initial.nextCursor)
	const [loading, setLoading] = useState(false)
	const observerRef = useRef<IntersectionObserver | null>(null)
	const currentAnchorRef = useRef<string>('')

	const anchorMap = buildAnchorMap(items)

	// scroll to fragment target on mount (once)
	const scrolledRef = useRef(false)
	useEffect(() => {
		if (scrolledRef.current || !at) return
		scrolledRef.current = true

		const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : ''
		const targetIndex = Math.max(1, Number.parseInt(hash, 10) || 1)

		const dayItems = items.filter(
			(item) => (item.publishedAt ?? item.createdAt).slice(0, 10) === at,
		)
		if (dayItems.length === 0) return

		const clampedIndex = Math.min(targetIndex, dayItems.length)
		const el = document.getElementById(`at-${clampedIndex}`)
		if (el) {
			requestAnimationFrame(() => el.scrollIntoView({ behavior: 'instant', block: 'start' }))
		}
	}, [at, items])

	// intersection observer -- tracks topmost visible entry in a ref
	const entryRefCallback = useCallback((node: HTMLDivElement | null) => {
		if (!node || !observerRef.current) return
		observerRef.current.observe(node)
	}, [])

	useEffect(() => {
		if (typeof window === 'undefined') return

		observerRef.current = new IntersectionObserver(
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
			},
			{ rootMargin: '-80px 0px -70% 0px' },
		)

		return () => {
			observerRef.current?.disconnect()
		}
	}, [])

	async function loadMore() {
		if (!cursor || loading) return
		setLoading(true)
		try {
			const result: CursorTimeline = await getTimelineCursor({ data: { cursor } })
			setItems((prev) => [...prev, ...result.items])
			setCursor(result.nextCursor)

			if (currentAnchorRef.current) {
				const [dateKey, idx] = currentAnchorRef.current.split('#')
				const url = idx === '1' ? `/?at=${dateKey}` : `/?at=${dateKey}#${idx}`
				history.replaceState(null, '', url)
			}
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
								entryRef={entryRefCallback}
							/>
						))}
					</div>
				</div>
			))}

			{items.length === 0 && (
				<p className="text-content-secondary py-12 text-center">No content found.</p>
			)}

			{cursor && (
				<div className="flex justify-center pt-8">
					<button
						type="button"
						onClick={() => void loadMore()}
						disabled={loading}
						className="border-border-default text-content-primary hover:bg-elevated disabled:text-content-disabled rounded-full border px-6 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
					>
						{loading ? 'Loading...' : 'Load more'}
					</button>
				</div>
			)}
		</section>
	)
}
