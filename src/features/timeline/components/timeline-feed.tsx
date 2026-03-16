import { TimelineMonth } from '~/features/timeline/components/timeline-month'
import type { TimelineViewModel } from '~/features/timeline/lib/view-model'

export function TimelineFeed({
	viewModel,
	atDate,
}: {
	viewModel: TimelineViewModel
	atDate?: string
}) {
	const { anchorMap, yearGroups } = viewModel

	return (
		<>
			{yearGroups.map((yearGroup, yearIndex) => (
				<div key={yearGroup.year}>
					<div className="space-y-10">
						{yearGroup.months.map((monthGroup, monthIndex) => (
							<TimelineMonth
								key={monthGroup.monthKey}
								monthKey={monthGroup.monthKey}
								items={monthGroup.items}
								hideHeader={yearIndex === 0 && monthIndex === 0}
								yearLabel={monthIndex === 0 && yearIndex > 0 ? yearGroup.year : undefined}
								anchorMap={anchorMap}
								atDate={atDate}
							/>
						))}
					</div>
				</div>
			))}

			{yearGroups.length === 0 && (
				<p className="text-content-secondary py-12 text-center">No content found.</p>
			)}
		</>
	)
}
