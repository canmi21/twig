import { createFileRoute, Link } from '@tanstack/react-router'
import { marked } from 'marked'
import { getPostBySlug, type PostDetail } from '~/server/functions/posts'

export const Route = createFileRoute('/post/$slug')({
	loader: async ({ params }): Promise<PostDetail | null> =>
		await getPostBySlug({ data: { slug: params.slug } }),
	notFoundComponent: () => (
		<section className="py-16 text-center">
			<h1 className="text-foreground text-2xl font-semibold">Post not found</h1>
			<p className="text-muted-foreground mt-2">The post you are looking for does not exist.</p>
			<Link to="/" className="text-primary mt-4 inline-block text-sm font-medium hover:underline">
				Back to home
			</Link>
		</section>
	),
	component: PostPage,
})

function formatDate(timestamp: number): string {
	return new Date(timestamp).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	})
}

function PostPage() {
	const post = Route.useLoaderData()

	if (!post) {
		return (
			<section className="py-16 text-center">
				<h1 className="text-foreground text-2xl font-semibold">Post not found</h1>
				<p className="text-muted-foreground mt-2">The post you are looking for does not exist.</p>
				<Link to="/" className="text-primary mt-4 inline-block text-sm font-medium hover:underline">
					Back to home
				</Link>
			</section>
		)
	}

	return (
		<article className="mx-auto max-w-3xl rounded-[1.75rem]">
			<Link
				to="/"
				className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1 text-sm no-underline transition-colors"
			>
				&larr; Back to posts
			</Link>
			<header className="border-border/80 mb-8 border-b pb-6">
				<h1 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
					{post.title}
				</h1>
				<p className="text-muted-foreground mt-2 text-sm">{formatDate(post.createdAt)}</p>
			</header>
			{/* Content is authored by site owner, not user-generated input */}
			<div
				className="prose prose-sm sm:prose-base max-w-none"
				dangerouslySetInnerHTML={{ __html: marked.parse(post.content) as string }}
			/>
		</article>
	)
}
