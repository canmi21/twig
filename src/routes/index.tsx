import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { getPostsPaginated, type PaginatedPosts } from '~/server/functions/posts'
import { getPlatformStatus } from '~/server/functions/health'

export const Route = createFileRoute('/')({
	validateSearch: (search: Record<string, unknown>) => ({
		page: Number(search.page) || 1,
	}),
	loaderDeps: ({ search }) => ({ page: search.page }),
	loader: async ({ deps }): Promise<PaginatedPosts> => {
		// Seed database on first load (idempotent)
		await getPlatformStatus()
		return await getPostsPaginated({ data: { page: deps.page } })
	},
	component: HomePage,
})

function formatDate(timestamp: number): string {
	return new Date(timestamp).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	})
}

function HomePage() {
	const { posts, totalPages, currentPage } = Route.useLoaderData()
	const navigate = useNavigate()

	return (
		<section className="space-y-10">
			<div className="divide-border divide-y">
				{posts.map((post) => (
					<article key={post.slug} className="py-6 first:pt-0 last:pb-0">
						<Link
							to="/post/$slug"
							params={{ slug: post.slug }}
							className="text-content-heading hover:text-primary text-xl font-semibold no-underline transition-colors"
						>
							{post.title}
						</Link>
						<p className="text-content-secondary mt-1 text-sm">{formatDate(post.createdAt)}</p>
						{/* Content is authored by site owner, not user-generated input */}
						<div
							className="prose prose-sm mt-3 max-w-none"
							dangerouslySetInnerHTML={{ __html: post.html }}
						/>
						<Link
							to="/post/$slug"
							params={{ slug: post.slug }}
							className="text-primary hover:text-accent-hover mt-3 inline-block text-sm no-underline transition-colors hover:underline"
						>
							Read more
						</Link>
					</article>
				))}
			</div>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-4" aria-label="Pagination">
					<button
						type="button"
						disabled={currentPage <= 1}
						onClick={() => void navigate({ search: { page: currentPage - 1 } })}
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
						onClick={() => void navigate({ search: { page: currentPage + 1 } })}
						className="border-border-default text-content-primary hover:bg-elevated disabled:text-content-disabled rounded-md border px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
					>
						Next
					</button>
				</nav>
			)}
		</section>
	)
}
