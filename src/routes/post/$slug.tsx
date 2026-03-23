/* src/routes/post/$slug.tsx */

import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { NotFoundPage } from '~/components/not-found-page'
import { getPublishedPostBySlug } from '~/features/content/server'
import { formatDate } from '~/lib/date'

export const Route = createFileRoute('/post/$slug')({
	loader: ({ params }) => getPublishedPostBySlug({ data: { slug: params.slug } }),
	headers: () => ({
		'Cache-Control': 'public, max-age=0, must-revalidate',
		'CDN-Cache-Control': 'max-age=86400, stale-while-revalidate=86400',
	}),
	notFoundComponent: () => <NotFoundPage />,
	component: PostPage,
})

const rootRoute = getRouteApi('__root__')

function PostPage() {
	const { html, meta } = Route.useLoaderData()
	const { timezone } = rootRoute.useRouteContext()
	const tags: string[] = meta.tags ? JSON.parse(meta.tags) : []

	return (
		<article className="border-border-subtle bg-surface rounded-lg border px-8 py-10 shadow-(--shadow-md) sm:px-12 sm:py-12">
			<header className="mb-8">
				<h1 className="text-content-heading text-3xl font-bold tracking-tight sm:text-4xl">
					{meta.title}
				</h1>
				<div className="text-content-secondary mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
					<time dateTime={meta.createdAt} suppressHydrationWarning>
						{formatDate(meta.createdAt, { month: 'long', timeZone: timezone })}
					</time>
					{tags.length > 0 && (
						<div className="flex flex-wrap gap-1.5">
							{tags.map((tag) => (
								<span
									key={tag}
									className="bg-accent-subtle text-accent-on-subtle rounded-full px-2.5 py-0.5 text-xs font-medium"
								>
									{tag}
								</span>
							))}
						</div>
					)}
				</div>
			</header>
			{/* Content is server-rendered from trusted markdown source via renderMarkdown() */}
			<div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
		</article>
	)
}
