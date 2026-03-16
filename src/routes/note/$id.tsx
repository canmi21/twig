import { createFileRoute, Link } from '@tanstack/react-router'
import { TagList } from '~/features/content/components/tag-list'
import { getContentById, type ContentDetail } from '~/features/content/server/content'

export const Route = createFileRoute('/note/$id')({
	loader: async ({ params }): Promise<ContentDetail | null> =>
		await getContentById({ data: { id: params.id } }),
	notFoundComponent: NotFound,
	component: NotePage,
})

function NotFound() {
	return (
		<section className="py-16 text-center">
			<h1 className="text-content-heading text-2xl font-semibold">Note not found</h1>
			<p className="text-content-secondary mt-2">The note you are looking for does not exist.</p>
			<Link
				to="/"
				className="text-primary hover:text-accent-hover mt-4 inline-block text-sm font-medium transition-colors hover:underline"
			>
				Back to timeline
			</Link>
		</section>
	)
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	})
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

function NotePage() {
	const note = Route.useLoaderData()

	if (!note) return <NotFound />

	return (
		<article className="mx-auto max-w-3xl">
			<Link
				to="/"
				className="text-content-secondary hover:text-content-heading mb-6 inline-flex items-center gap-1 text-sm no-underline transition-colors"
			>
				&larr; Back to timeline
			</Link>
			<header className="border-border-default mb-8 border-b pb-6">
				{note.title && (
					<h1 className="text-content-heading text-2xl font-semibold tracking-tight sm:text-3xl">
						{note.title}
					</h1>
				)}
				<p className="text-content-secondary mt-2 text-sm">
					{formatDate(note.publishedAt ?? note.createdAt)}
				</p>
				{note.tags.length > 0 && (
					<div className="mt-3">
						<TagList tags={note.tags} />
					</div>
				)}
			</header>
			<ContentHtml html={note.contentHtml} />
		</article>
	)
}
