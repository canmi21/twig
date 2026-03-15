import { createFileRoute, Link } from '@tanstack/react-router'
import { getContentBySlug, type ContentDetail } from '~/server/functions/content'
import { TagList } from '~/components/tag-list'

export const Route = createFileRoute('/post/$slug')({
	loader: async ({ params }): Promise<ContentDetail | null> =>
		await getContentBySlug({ data: { slug: params.slug } }),
	notFoundComponent: NotFound,
	component: PostPage,
})

function NotFound() {
	return (
		<section className="py-16 text-center">
			<h1 className="text-content-heading text-2xl font-semibold">Post not found</h1>
			<p className="text-content-secondary mt-2">The post you are looking for does not exist.</p>
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

function PostPage() {
	const post = Route.useLoaderData()

	if (!post) return <NotFound />

	return (
		<article className="mx-auto max-w-3xl">
			<Link
				to="/"
				className="text-content-secondary hover:text-content-heading mb-6 inline-flex items-center gap-1 text-sm no-underline transition-colors"
			>
				&larr; Back to timeline
			</Link>
			{post.coverImage && (
				<img
					src={post.coverImage}
					alt={post.title ?? ''}
					className="mb-6 h-56 w-full rounded-lg object-cover sm:h-72"
				/>
			)}
			<header className="border-border-default mb-8 border-b pb-6">
				<h1 className="text-content-heading text-3xl font-semibold tracking-tight sm:text-4xl">
					{post.title}
				</h1>
				<p className="text-content-secondary mt-2 text-sm">
					{formatDate(post.publishedAt ?? post.createdAt)}
				</p>
				{post.tags.length > 0 && (
					<div className="mt-3">
						<TagList tags={post.tags} />
					</div>
				)}
			</header>
			<ContentHtml html={post.contentHtml} />
		</article>
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
