import { Link } from '@tanstack/react-router'
import type { TimelineItem } from '~/server/functions/content'
import { ContentCard } from '~/components/content-card'

function formatDayLabel(iso: string): string {
	const date = new Date(iso)
	const day = date.toLocaleDateString('en-US', { day: 'numeric' })
	const weekday = date.toLocaleDateString('en-US', { weekday: 'short' })
	return `${day} ${weekday}`
}

function EntryLink({ item, children }: { item: TimelineItem; children: React.ReactNode }) {
	if (item.type === 'post' && item.slug) {
		return (
			<Link to="/post/$slug" params={{ slug: item.slug }} className="no-underline">
				{children}
			</Link>
		)
	}
	if (item.type === 'project' && item.slug) {
		return (
			<Link to="/project/$slug" params={{ slug: item.slug }} className="no-underline">
				{children}
			</Link>
		)
	}
	return <>{children}</>
}

/** Items with a detail page get cursor-pointer on the card */
function hasDetailPage(item: TimelineItem): boolean {
	return (
		(item.type === 'post' && !!item.slug) ||
		(item.type === 'project' && !!item.slug) ||
		item.type === 'note'
	)
}

export function TimelineEntry({
	item,
	layout = 'full',
	anchorId,
	dataAnchor,
	itemIndex,
}: {
	item: TimelineItem
	layout?: 'full' | 'card-only'
	anchorId?: string
	dataAnchor?: string
	itemIndex?: number
}) {
	const hasCover = !!item.coverImage
	const clickable = hasDetailPage(item)

	return (
		<div
			id={anchorId ?? `item-${item.id}`}
			className="scroll-mt-24"
			data-anchor={dataAnchor}
			data-item-index={itemIndex}
		>
			{layout === 'full' && (
				<p className="text-content-tertiary mb-1 text-xs sm:hidden">
					{formatDayLabel(item.publishedAt ?? item.createdAt)}
				</p>
			)}

			<article
				className={`border-border-default bg-surface overflow-hidden rounded-md border shadow-[var(--shadow-md)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)] ${clickable ? 'cursor-pointer' : ''}`}
			>
				{hasCover && (
					<EntryLink item={item}>
						<img
							src={item.coverImage!}
							alt={item.title ?? ''}
							className="h-[120px] w-full object-cover"
							loading="lazy"
						/>
					</EntryLink>
				)}
				<div className="px-4 py-3">
					<ContentCard item={item} variant="embedded" />
				</div>
			</article>
		</div>
	)
}
