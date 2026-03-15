import type { TimelineItem } from '~/server/functions/content'

/** Extract YYYY-MM-DD from an item's effective date */
export function itemDateKey(item: TimelineItem): string {
	return (item.publishedAt ?? item.createdAt).slice(0, 10)
}

/**
 * Assign anchor indices (1-based) to items sharing the same day.
 * Returns a Map from item id to { dateKey, index }.
 */
export function buildAnchorMap(
	items: TimelineItem[],
): Map<string, { dateKey: string; index: number }> {
	const map = new Map<string, { dateKey: string; index: number }>()
	const dayCounts = new Map<string, number>()

	for (const item of items) {
		const dk = itemDateKey(item)
		const idx = (dayCounts.get(dk) ?? 0) + 1
		dayCounts.set(dk, idx)
		map.set(item.id, { dateKey: dk, index: idx })
	}

	return map
}

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
