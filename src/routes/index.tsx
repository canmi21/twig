import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getTimelineItems, type PaginatedTimeline } from '~/server/functions/content'
import { getPlatformStatus } from '~/server/functions/health'
import { ContentCard } from '~/components/content-card'
import { TimelineFilter } from '~/components/timeline-filter'

export const Route = createFileRoute('/')({
	validateSearch: (search: Record<string, unknown>) => ({
		page: Number(search.page) || 1,
		type: (search.type as string) || undefined,
		tag: (search.tag as string) || undefined,
	}),
	loaderDeps: ({ search }) => search,
	loader: async ({ deps }): Promise<PaginatedTimeline> => {
		await getPlatformStatus()
		return await getTimelineItems({ data: { page: deps.page, type: deps.type, tag: deps.tag } })
	},
	component: TimelinePage,
})

function TimelinePage() {
	const { items, totalPages, currentPage } = Route.useLoaderData()
	const navigate = useNavigate()
	const { tag } = Route.useSearch()

	return (
		<section>
			<TimelineFilter />
			{tag && (
				<p className="text-content-secondary mb-4 text-sm">
					Filtered by tag: <span className="text-primary font-medium">#{tag}</span>
				</p>
			)}
			<div className="space-y-4">
				{items.map((item) => (
					<ContentCard key={item.id} item={item} />
				))}
			</div>
			{items.length === 0 && (
				<p className="text-content-secondary py-12 text-center">No content found.</p>
			)}
			{totalPages > 1 && (
				<nav className="mt-8 flex items-center justify-center gap-4" aria-label="Pagination">
					<button
						type="button"
						disabled={currentPage <= 1}
						onClick={() =>
							void navigate({ search: (prev) => ({ ...prev, page: currentPage - 1 }) })
						}
						className="border-border-default text-content-primary hover:bg-elevated disabled:text-content-disabled rounded-md border px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
					>
						Previous
					</button>
					<span className="text-content-secondary text-sm">
						Page {currentPage} of {totalPages}
					</span>
					<button
						type="button"
						disabled={currentPage >= totalPages}
						onClick={() =>
							void navigate({ search: (prev) => ({ ...prev, page: currentPage + 1 }) })
						}
						className="border-border-default text-content-primary hover:bg-elevated disabled:text-content-disabled rounded-md border px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
					>
						Next
					</button>
				</nav>
			)}
		</section>
	)
}
