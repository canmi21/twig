import { Link } from '@tanstack/react-router'
import type { TimelineItem } from '~/server/functions/content'
import { ContentTypeBadge } from '~/components/content-type-badge'
import { TagList } from '~/components/tag-list'
import { RatingStars } from '~/components/rating-stars'

function ContentLink({ item, children }: { item: TimelineItem; children: React.ReactNode }) {
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
	if (item.type === 'note') {
		return (
			<Link to="/note/$id" params={{ id: item.id }} className="no-underline">
				{children}
			</Link>
		)
	}
	return <>{children}</>
}

/*
 * Icon positioning: anchored at a fixed offset from the card's bottom-right corner.
 * The offset equals half the height of a minimal single-line card (~10px from content edge),
 * so the icon naturally centers vertically in short cards and sits at the bottom-right in tall ones.
 */
export function ContentCard({
	item,
	variant = 'standalone',
}: {
	item: TimelineItem
	variant?: 'standalone' | 'embedded'
}) {
	const hasTitle = !!item.title
	const isShort = !hasTitle && !item.coverImage
	const hasTags = item.tags.length > 0

	return (
		<article
			className={
				variant === 'standalone' ? 'border-border-default overflow-hidden rounded-lg border' : ''
			}
		>
			{/* standalone hero image */}
			{variant === 'standalone' && item.coverImage && (
				<ContentLink item={item}>
					<img
						src={item.coverImage}
						alt={item.title ?? ''}
						className="h-48 w-full object-cover"
						loading="lazy"
					/>
				</ContentLink>
			)}

			<div className={`relative ${variant === 'standalone' && item.coverImage ? 'p-4' : ''}`}>
				{isShort ? (
					/* short text: content fills, icon positioned absolutely */
					<div className="pr-6">
						{/* owner-authored content */}
						<div
							className="prose prose-sm line-clamp-3 max-w-none"
							// biome-ignore lint: owner-authored content
							dangerouslySetInnerHTML={{ __html: item.contentHtml }}
						/>
					</div>
				) : (
					/* standard card */
					<>
						{hasTitle && (
							<ContentLink item={item}>
								<h2 className="text-content-heading hover:text-primary mb-0.5 text-base font-semibold transition-colors">
									{item.title}
								</h2>
							</ContentLink>
						)}

						{/* media: creator + rating */}
						{item.media && (
							<div className="mb-1 flex items-center gap-2 text-sm">
								{item.media.creator && (
									<span className="text-content-secondary text-xs">{item.media.creator}</span>
								)}
								{item.media.rating != null && <RatingStars rating={item.media.rating} />}
							</div>
						)}

						{/* project: status + tech stack */}
						{item.project && (
							<div className="text-content-secondary mb-1.5 flex flex-wrap gap-1.5 text-xs">
								<span className="bg-elevated rounded px-1.5 py-0.5 font-medium">
									{item.project.status}
								</span>
								{item.project.techStack.map((t) => (
									<span key={t} className="bg-elevated rounded px-1.5 py-0.5">
										{t}
									</span>
								))}
							</div>
						)}

						{/* summary or content preview */}
						{item.summary ? (
							<p className="text-content-secondary mb-1.5 truncate text-sm">{item.summary}</p>
						) : (
							item.contentHtml && (
								<div
									className="prose prose-sm mb-1.5 line-clamp-2 max-w-none"
									// biome-ignore lint: owner-authored content
									dangerouslySetInnerHTML={{ __html: item.contentHtml }}
								/>
							)
						)}

						{/* tags: leave right space for icon */}
						{hasTags && (
							<div className="pr-6">
								<TagList tags={item.tags} />
							</div>
						)}
					</>
				)}

				{/* type icon: fixed offset from bottom-right corner of content area */}
				<span className="text-content-tertiary absolute right-0 bottom-0">
					<ContentTypeBadge type={item.type} mediaType={item.media?.mediaType} />
				</span>
			</div>
		</article>
	)
}
