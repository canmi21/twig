import { Link } from '@tanstack/react-router'
import { Pin } from 'lucide-react'
import { getContentWeight } from '~/server/database/constants'
import type { TimelineItem } from '~/server/functions/content'
import { ContentTypeBadge } from '~/components/content-type-badge'
import { TagList } from '~/components/tag-list'
import { RatingStars } from '~/components/rating-stars'

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	})
}

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

function HeavyCard({ item }: { item: TimelineItem }) {
	return (
		<article className="border-border-default overflow-hidden rounded-lg border">
			{item.coverImage && (
				<ContentLink item={item}>
					<img
						src={item.coverImage}
						alt={item.title ?? ''}
						className="h-48 w-full object-cover"
						loading="lazy"
					/>
				</ContentLink>
			)}
			<div className="p-4">
				<div className="mb-2 flex items-center gap-2">
					<ContentTypeBadge type={item.type} />
					{item.isPinned === 1 && <Pin className="text-primary size-3.5" />}
					<span className="text-content-tertiary text-xs">
						{formatDate(item.publishedAt ?? item.createdAt)}
					</span>
				</div>
				{item.title && (
					<ContentLink item={item}>
						<h2 className="text-content-heading hover:text-primary mb-1 text-lg font-semibold transition-colors">
							{item.title}
						</h2>
					</ContentLink>
				)}
				{item.summary && <p className="text-content-secondary mb-3 text-sm">{item.summary}</p>}
				{item.project && (
					<div className="text-content-secondary mb-2 flex flex-wrap gap-1.5 text-xs">
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
				<TagList tags={item.tags} />
			</div>
		</article>
	)
}

function MediumCard({ item }: { item: TimelineItem }) {
	return (
		<article className="border-border-default rounded-lg border p-4">
			<div className="mb-2 flex items-center gap-2">
				<ContentTypeBadge type={item.type} />
				<span className="text-content-tertiary text-xs">
					{formatDate(item.publishedAt ?? item.createdAt)}
				</span>
			</div>
			{item.title && (
				<ContentLink item={item}>
					<h3 className="text-content-heading hover:text-primary mb-1 font-semibold transition-colors">
						{item.title}
					</h3>
				</ContentLink>
			)}
			{item.media && (
				<div className="mb-2 flex items-center gap-2 text-sm">
					{item.media.creator && (
						<span className="text-content-secondary">{item.media.creator}</span>
					)}
					{item.media.rating != null && <RatingStars rating={item.media.rating} />}
				</div>
			)}
			{item.summary ? (
				<p className="text-content-secondary mb-2 text-sm">{item.summary}</p>
			) : (
				/* Content is authored by site owner, not user-generated input */
				<div
					className="prose prose-sm mb-2 max-w-none"
					dangerouslySetInnerHTML={{ __html: item.contentHtml }}
				/>
			)}
			<TagList tags={item.tags} />
		</article>
	)
}

function LightCard({ item }: { item: TimelineItem }) {
	return (
		<article className="border-border-subtle flex gap-3 border-b py-3 last:border-b-0">
			<div className="shrink-0 pt-0.5">
				<ContentTypeBadge type={item.type} />
			</div>
			<div className="min-w-0 flex-1">
				{item.title && (
					<p className="text-content-heading mb-0.5 text-sm font-medium">{item.title}</p>
				)}
				{/* Content is authored by site owner, not user-generated input */}
				<div
					className="prose prose-sm max-w-none"
					dangerouslySetInnerHTML={{ __html: item.contentHtml }}
				/>
				<span className="text-content-tertiary mt-1 block text-xs">
					{formatDate(item.publishedAt ?? item.createdAt)}
				</span>
			</div>
		</article>
	)
}

export function ContentCard({ item }: { item: TimelineItem }) {
	const weight = getContentWeight(item.type)

	switch (weight) {
		case 'heavy':
			return <HeavyCard item={item} />
		case 'medium':
			return <MediumCard item={item} />
		case 'light':
			return <LightCard item={item} />
	}
}
