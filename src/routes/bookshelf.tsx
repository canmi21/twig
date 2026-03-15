import { createFileRoute } from '@tanstack/react-router'
import { getMediaCollection, type TimelineItem } from '~/server/functions/content'
import { getPlatformStatus } from '~/server/functions/health'
import { RatingStars } from '~/components/rating-stars'

const MEDIA_TABS = [
	{ value: undefined, label: 'All' },
	{ value: 'book', label: 'Books' },
	{ value: 'movie', label: 'Movies' },
	{ value: 'music', label: 'Music' },
] as const

export const Route = createFileRoute('/bookshelf')({
	validateSearch: (search: Record<string, unknown>) => ({
		mediaType: (search.mediaType as string) || undefined,
	}),
	loaderDeps: ({ search }) => search,
	loader: async ({ deps }): Promise<TimelineItem[]> => {
		await getPlatformStatus()
		return await getMediaCollection({ data: { mediaType: deps.mediaType } })
	},
	component: BookshelfPage,
})

function BookshelfPage() {
	const items = Route.useLoaderData()
	const { mediaType } = Route.useSearch()

	return (
		<section>
			<h1 className="text-content-heading mb-6 text-2xl font-semibold">Bookshelf</h1>
			<nav
				className="border-border-default mb-6 flex gap-1.5 border-b pb-3"
				aria-label="Media type filter"
			>
				{MEDIA_TABS.map(({ value, label }) => {
					const isActive = mediaType === value || (!mediaType && !value)
					return (
						<a
							key={label}
							href={value ? `?mediaType=${value}` : '/bookshelf'}
							className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium no-underline transition-colors ${
								isActive
									? 'bg-primary text-primary-foreground'
									: 'text-content-secondary hover:bg-elevated'
							}`}
						>
							{label}
						</a>
					)
				})}
			</nav>
			<div className="space-y-4">
				{items.map((item) => (
					<article key={item.id} className="border-border-default flex gap-4 rounded-lg border p-4">
						{item.media?.cover && (
							<img
								src={item.media.cover}
								alt={item.title ?? ''}
								className="h-28 w-20 shrink-0 rounded object-cover"
								loading="lazy"
							/>
						)}
						<div className="min-w-0 flex-1">
							<h3 className="text-content-heading font-semibold">{item.title}</h3>
							{item.media?.creator && (
								<p className="text-content-secondary text-sm">{item.media.creator}</p>
							)}
							<div className="mt-1 flex items-center gap-2">
								{item.media?.mediaType && (
									<span className="bg-elevated text-content-secondary rounded px-1.5 py-0.5 text-xs capitalize">
										{item.media.mediaType}
									</span>
								)}
								{item.media?.year && (
									<span className="text-content-tertiary text-xs">{item.media.year}</span>
								)}
								{item.media?.rating != null && <RatingStars rating={item.media.rating} />}
							</div>
							{item.media?.comment && (
								<p className="text-content-secondary mt-2 text-sm">{item.media.comment}</p>
							)}
						</div>
					</article>
				))}
			</div>
			{items.length === 0 && (
				<p className="text-content-secondary py-12 text-center">No media entries yet.</p>
			)}
		</section>
	)
}
