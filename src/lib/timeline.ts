import type { TimelineItem } from '~/server/functions/content'

export interface MonthGroup {
	monthKey: string
	items: TimelineItem[]
}

export interface YearGroup {
	year: string
	months: MonthGroup[]
}

/**
 * Groups timeline items by year then month.
 * Items must already be sorted descending.
 */
export function groupByYearMonth(items: TimelineItem[]): YearGroup[] {
	const yearMap = new Map<string, Map<string, TimelineItem[]>>()

	for (const item of items) {
		const date = item.publishedAt ?? item.createdAt
		const year = date.slice(0, 4)
		const monthKey = date.slice(0, 7) // YYYY-MM

		let monthMap = yearMap.get(year)
		if (!monthMap) {
			monthMap = new Map()
			yearMap.set(year, monthMap)
		}

		const list = monthMap.get(monthKey)
		if (list) {
			list.push(item)
		} else {
			monthMap.set(monthKey, [item])
		}
	}

	return Array.from(yearMap.entries()).map(([year, monthMap]) => ({
		year,
		months: Array.from(monthMap.entries()).map(([monthKey, monthItems]) => ({
			monthKey,
			items: monthItems,
		})),
	}))
}
