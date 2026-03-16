import type { TimelineItem } from '~/features/content/server/types'
import {
	buildAnchorMap,
	groupByYearMonth,
	itemDateKey,
	type TimelineAnchorMap,
	type YearGroup,
} from './timeline'

export interface TimelineViewModel {
	anchorMap: TimelineAnchorMap
	yearGroups: YearGroup[]
}

export function buildTimelineViewModel(items: TimelineItem[]): TimelineViewModel {
	return {
		anchorMap: buildAnchorMap(items),
		yearGroups: groupByYearMonth(items),
	}
}

export function getTimelineReadMoreTarget(items: TimelineItem[], anchorMap: TimelineAnchorMap) {
	const lastItem = items[items.length - 1]
	if (!lastItem) return { at: undefined, hash: '' }

	const anchor = anchorMap.get(lastItem.id)
	return {
		at: itemDateKey(lastItem),
		hash: anchor && anchor.index > 1 ? `#${anchor.index}` : '',
	}
}

export function anchorToTimelineUrl(anchor: string): string {
	const [dateKey, index] = anchor.split('#')
	return index === '1' ? `/timeline?at=${dateKey}` : `/timeline?at=${dateKey}#${index}`
}

export function getTimelineHashTarget(hash: string): number {
	return Math.max(1, Number.parseInt(hash, 10) || 1)
}
