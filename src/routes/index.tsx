import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { getTimelineCursor, type CursorTimeline } from '~/server/functions/content'
import { getPlatformStatus } from '~/server/functions/health'
import { groupByYearMonth, buildAnchorMap, itemDateKey } from '~/lib/timeline'
import { TimelineMonth } from '~/components/timeline-month'
import { SiteFooter } from '~/components/site-footer'

const HOME_LIMIT = 20

export const Route = createFileRoute('/')({
	loader: async (): Promise<CursorTimeline> => {
		await getPlatformStatus()
		return await getTimelineCursor({ data: { limit: HOME_LIMIT } })
	},
	component: HomePage,
})

function HomePage() {
	const { items, nextCursor } = Route.useLoaderData()

	const anchorMap = buildAnchorMap(items)
	const yearGroups = groupByYearMonth(items)

	// compute the "read more" link target: the last item's date as ?at anchor
	const lastItem = items.length > 0 ? items[items.length - 1] : null
	const lastDate = lastItem ? itemDateKey(lastItem) : undefined
	const lastAnchor = lastItem ? anchorMap.get(lastItem.id) : null
	const readMoreAt = lastDate
	const readMoreHash = lastAnchor && lastAnchor.index > 1 ? `#${lastAnchor.index}` : ''

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
							/>
						))}
					</div>
				</div>
			))}

			{items.length === 0 && (
				<p className="text-content-secondary py-12 text-center">No content found.</p>
			)}

			{/* "Read more" card -- links to full timeline starting where homepage left off */}
			{nextCursor && (
				<div className="mt-8">
					<Link
						to="/timeline"
						search={readMoreAt ? { at: readMoreAt } : {}}
						hash={readMoreHash}
						className="border-border-default bg-surface hover:bg-elevated group flex items-center justify-between rounded-md border px-5 py-4 no-underline shadow-[var(--shadow-md)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]"
					>
						<div>
							<p className="text-content-heading text-sm font-semibold">Read more</p>
							<p className="text-content-tertiary text-xs">Continue browsing the full timeline</p>
						</div>
						<ArrowRight className="text-content-tertiary group-hover:text-primary size-4 transition-colors" />
					</Link>
				</div>
			)}

			<SiteFooter />
		</section>
	)
}
