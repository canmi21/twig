import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
	getTimelineCursor,
	type CursorTimeline,
	type TimelineItem,
} from '~/server/functions/content'
import { getPlatformStatus } from '~/server/functions/health'
import { groupByYearMonth } from '~/lib/timeline'
import { TimelineMonth } from '~/components/timeline-month'

export const Route = createFileRoute('/')({
	loader: async (): Promise<CursorTimeline> => {
		await getPlatformStatus()
		return await getTimelineCursor({ data: {} })
	},
	component: TimelinePage,
})

function TimelinePage() {
	const initial = Route.useLoaderData()
	const [items, setItems] = useState<TimelineItem[]>(initial.items)
	const [cursor, setCursor] = useState<string | null>(initial.nextCursor)
	const [loading, setLoading] = useState(false)

	async function loadMore() {
		if (!cursor || loading) return
		setLoading(true)
		try {
			const result: CursorTimeline = await getTimelineCursor({ data: { cursor } })
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
					{/* month groups -- year divider is merged into first month's header */}
					<div className="space-y-10">
						{yearGroup.months.map((mg, mi) => (
							<TimelineMonth
								key={mg.monthKey}
								monthKey={mg.monthKey}
								items={mg.items}
								hideHeader={yi === 0 && mi === 0}
								yearLabel={mi === 0 && yi > 0 ? yearGroup.year : undefined}
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
