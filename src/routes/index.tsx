import { createFileRoute, getRouteApi, Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { getTimelineCursor, type CursorTimeline } from '~/features/content/server/content'
import { SiteFooter } from '~/features/site/components/site-footer'
import { getPlatformStatus } from '~/features/platform/server/health'
import { TimelineMonth } from '~/features/timeline/components/timeline-month'
import { groupByYearMonth, buildAnchorMap, itemDateKey } from '~/features/timeline/lib/timeline'

const HOME_LIMIT = 20

export const Route = createFileRoute('/')({
	loader: async (): Promise<CursorTimeline> => {
		await getPlatformStatus()
		return await getTimelineCursor({ data: { limit: HOME_LIMIT } })
	},
	component: HomePage,
})

const rootApi = getRouteApi('__root__')

function HomePage() {
	const { items, nextCursor } = Route.useLoaderData()
	const { settings } = rootApi.useLoaderData()

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

			{/* read more -- small pill linking to full timeline */}
			{nextCursor && (
				<div className="mt-8 flex justify-center">
					<Link
						to="/timeline"
						search={readMoreAt ? { at: readMoreAt } : {}}
						hash={readMoreHash}
						className="border-border-default text-content-secondary hover:text-content-heading hover:border-border-strong inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-medium no-underline transition-colors"
					>
						Read more
						<ArrowRight className="size-3" />
					</Link>
				</div>
			)}

			<SiteFooter settings={settings} />
		</section>
	)
}
