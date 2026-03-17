/* src/routes/post/$slug.tsx */

import { createFileRoute } from '@tanstack/react-router'
import { getPublishedPostBySlug } from '~/features/content/server'

export const Route = createFileRoute('/post/$slug')({
	loader: ({ params }) => getPublishedPostBySlug({ data: { slug: params.slug } }),
	headers: () => ({
		'Cache-Control': 'public, max-age=0, must-revalidate',
		'CDN-Cache-Control': 'max-age=86400, stale-while-revalidate=86400',
	}),
	notFoundComponent: () => (
		<div className="py-20 text-center">
			<h1 className="text-content-heading text-2xl font-bold">Post not found</h1>
			<p className="text-content-secondary mt-2">
				The post you are looking for does not exist or is not published.
			</p>
		</div>
	),
	component: PostPage,
})

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	})
}

function PostPage() {
	const { html, meta } = Route.useLoaderData()
	const tags: string[] = meta.tags ? JSON.parse(meta.tags) : []

	return (
		<article>
			<header className="mb-8">
				<h1 className="text-content-heading text-3xl font-bold tracking-tight sm:text-4xl">
					{meta.title}
				</h1>
				<div className="text-content-secondary mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
					<time dateTime={meta.createdAt}>{formatDate(meta.createdAt)}</time>
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