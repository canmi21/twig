import { useState, useEffect, useRef } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
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

	// observe all [data-anchor] elements, update URL silently on scroll
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
	}, [items]) // re-observe when items change (Load more)

	async function loadMore() {
		if (!cursor || loading) return
		setLoading(true)
		try {
			const result: CursorTimeline = await getTimelineCursor({ data: { cursor } })
			setItems((prev) => [...prev, ...result.items])
			setCursor(result.nextCursor)

			if (currentAnchorRef.current) {
				silentReplaceUrl(router.history, anchorToUrl(currentAnchorRef.current))
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
