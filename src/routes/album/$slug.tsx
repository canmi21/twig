import { createFileRoute, Link } from '@tanstack/react-router'
import { getContentBySlug, type ContentDetail } from '~/server/functions/content'

export const Route = createFileRoute('/album/$slug')({
	loader: async ({ params }): Promise<ContentDetail | null> =>
		await getContentBySlug({ data: { slug: params.slug } }),
	notFoundComponent: NotFound,
	component: AlbumPage,
})

function NotFound() {
	return (
		<section className="py-16 text-center">
			<h1 className="text-content-heading text-2xl font-semibold">Album not found</h1>
			<p className="text-content-secondary mt-2">The album you are looking for does not exist.</p>
			<Link
				to="/"
				className="text-primary hover:text-accent-hover mt-4 inline-block text-sm font-medium transition-colors hover:underline"
			>
				Back to timeline
			</Link>
		</section>
	)
}

/** Renders owner-authored content (not user-generated input) */
function ContentHtml({ html }: { html: string }) {
	return (
		<div
			className="prose prose-sm sm:prose-base max-w-none"
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	)
}

function AlbumPage() {
	const album = Route.useLoaderData()

	if (!album) return <NotFound />

	return (
		<article className="mx-auto max-w-3xl">
			<Link
				to="/"
				className="text-content-secondary hover:text-content-heading mb-6 inline-flex items-center gap-1 text-sm no-underline transition-colors"
			>
				&larr; Back to timeline
			</Link>
			<h1 className="text-content-heading mb-4 text-2xl font-semibold">{album.title}</h1>
			<ContentHtml html={album.contentHtml} />
		</article>
	)
}
