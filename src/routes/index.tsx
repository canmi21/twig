import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { marked } from 'marked'
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
		<section className="space-y-8">
			<div className="space-y-6">
				{posts.map((post) => (
					<article
						key={post.slug}
						className="border-border bg-background rounded-[1.5rem] border p-6 shadow-[0_18px_48px_var(--shadow-color)] transition-shadow transition-transform hover:-translate-y-1 hover:shadow-[0_24px_60px_var(--shadow-color)]"
					>
						<Link
							to="/post/$slug"
							params={{ slug: post.slug }}
							className="text-foreground hover:text-primary text-xl font-semibold no-underline transition-colors"
						>
							{post.title}
						</Link>
						<p className="text-muted-foreground mt-1 text-sm">{formatDate(post.createdAt)}</p>
						{/* Content is authored by site owner, not user-generated input */}
						<div
							className="prose dark:prose-invert prose-sm mt-3 max-w-none"
							dangerouslySetInnerHTML={{ __html: marked.parse(post.content) as string }}
						/>
						<Link
							to="/post/$slug"
							params={{ slug: post.slug }}
							className="text-primary mt-3 inline-block text-sm font-medium no-underline hover:underline"
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
						className="border-border bg-background text-foreground hover:bg-secondary disabled:text-muted-foreground rounded-xl border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
					>
						Previous
					</button>
					<span className="text-muted-foreground text-sm">
						Page {currentPage} of {totalPages}
					</span>
					<button
						type="button"
						disabled={currentPage >= totalPages}
						onClick={() => void navigate({ search: { page: currentPage + 1 } })}
						className="border-border bg-background text-foreground hover:bg-secondary disabled:text-muted-foreground rounded-xl border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
					>
						Next
					</button>
				</nav>
			)}
		</section>
	)
}
