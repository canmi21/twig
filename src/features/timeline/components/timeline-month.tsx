import { Fragment } from 'react'
import type { TimelineItem } from '~/features/content/server/types'
import { TimelineEntry } from '~/features/timeline/components/timeline-entry'

function formatMonthName(yyyyMm: string): string {
	const [, m] = yyyyMm.split('-')
	const date = new Date(2000, Number(m) - 1)
	return date.toLocaleDateString('en-US', { month: 'long' })
}

function formatEntryDate(iso: string): { day: string; weekday: string } {
	const date = new Date(iso)
	return {
		day: date.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' }),
		weekday: date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
	}
}

export function TimelineMonth({
	monthKey,
	items,
	hideHeader = false,
	yearLabel,
	anchorMap,
	atDate,
	itemIndexOffset = 0,
}: {
	monthKey: string
	items: TimelineItem[]
	hideHeader?: boolean
	yearLabel?: string
	anchorMap: Map<string, { dateKey: string; index: number }>
	atDate?: string
	itemIndexOffset?: number
}) {
	const monthName = formatMonthName(monthKey)

	return (
		<section>
			{!hideHeader &&
				(yearLabel ? (
					<div className="mb-6 flex items-center gap-4 pt-6">
						<span className="text-content-heading text-base font-bold tracking-wide">
							{yearLabel}
						</span>
						<span className="bg-border-default h-px flex-1" />
					</div>
				) : (
					<div className="mb-6 flex items-center gap-3">
						<span className="text-content-tertiary text-xs font-medium tracking-wide">
							{monthName}
						</span>
						<span className="bg-border-subtle h-px flex-1" />
					</div>
				))}

			{/* desktop: 2-column grid -- day | card */}
			<div className="hidden sm:grid sm:grid-cols-[48px_1fr] sm:gap-x-5">
				{items.map((item, i) => {
					const dateStr = item.publishedAt ?? item.createdAt
					const { day, weekday } = formatEntryDate(dateStr)
					const anchor = anchorMap.get(item.id)
					const anchorId = anchor && anchor.dateKey === atDate ? `at-${anchor.index}` : undefined

					return (
						<Fragment key={item.id}>
							<div className="bg-background sticky top-20 z-10 self-start pt-3 pb-2">
								<p className="text-content-heading text-xl leading-none font-bold">{day}</p>
								<p className="text-content-tertiary mt-0.5 text-xs leading-none">{weekday}</p>
							</div>

							<div className={i < items.length - 1 ? 'mb-4 pt-1' : 'pt-1'}>
								<TimelineEntry
									item={item}
									layout="card-only"
									anchorId={anchorId}
									dataAnchor={anchor ? `${anchor.dateKey}#${anchor.index}` : undefined}
									itemIndex={itemIndexOffset + i}
								/>
							</div>
						</Fragment>
					)
				})}
			</div>

			{/* mobile */}
			<div className="space-y-4 sm:hidden">
				{items.map((item, i) => {
					const anchor = anchorMap.get(item.id)
					const anchorId = anchor && anchor.dateKey === atDate ? `at-${anchor.index}` : undefined

					return (
						<TimelineEntry
							key={item.id}
							item={item}
							layout="full"
							anchorId={anchorId}
							dataAnchor={anchor ? `${anchor.dateKey}#${anchor.index}` : undefined}
							itemIndex={itemIndexOffset + i}
						/>
					)
				})}
			</div>
		</section>
	)
}
