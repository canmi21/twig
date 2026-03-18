/* src/routes/~/index.tsx */

import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { deletePost, listPosts, publishPost, unpublishPost } from '~/features/content/server'

export const Route = createFileRoute('/~/')({
	loader: () => listPosts({ data: {} }),
	component: PostListPage,
})

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	})
}

function PostListPage() {
	const posts = Route.useLoaderData()
	const router = useRouter()

	async function handlePublish(cid: string) {
		await publishPost({ data: { cid } })
		await router.invalidate()
	}

	async function handleUnpublish(cid: string) {
		await unpublishPost({ data: { cid } })
		await router.invalidate()
	}

	async function handleDelete(cid: string) {
		if (!confirm('Are you sure you want to delete this post?')) {
			return
		}
		await deletePost({ data: { cid } })
		await router.invalidate()
	}

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<h2 className="text-content-heading text-lg font-semibold">Posts</h2>
				<Link
					to="/~/post/new"
					className="bg-primary text-on-primary rounded-md px-4 py-2 text-sm font-medium"
				>
					New Post
				</Link>
			</div>

			{posts.length === 0 ? (
				<p className="text-content-secondary text-sm">No posts yet.</p>
			) : (
				<table className="w-full text-sm">
					<thead>
						<tr className="border-border-subtle border-b text-left">
							<th className="py-2 font-medium">Title</th>
							<th className="py-2 font-medium">Slug</th>
							<th className="py-2 font-medium">Status</th>
							<th className="py-2 font-medium">Created</th>
							<th className="py-2 font-medium">Actions</th>
						</tr>
					</thead>
					<tbody>
						{posts.map((post) => (
							<tr key={post.cid} className="border-border-subtle border-b">
								<td className="py-2">{post.title}</td>
								<td className="text-content-secondary py-2 font-mono text-xs">{post.slug}</td>
								<td className="py-2">
									<span
										className={
											post.status === 'published'
												? 'rounded bg-green-500/10 px-2 py-0.5 text-xs text-green-700 dark:text-green-400'
												: 'rounded bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-700 dark:text-yellow-400'
										}
									>
										{post.status}
									</span>
								</td>
								<td className="text-content-secondary py-2">{formatDate(post.createdAt)}</td>
								<td className="py-2">
									<div className="flex gap-3">
										<Link
											to="/~/post/$cid"
											params={{ cid: post.cid }}
											className="text-primary text-xs hover:underline"
										>
											Edit
										</Link>
										{post.status === 'published' ? (
											<button
												type="button"
												onClick={() => void handleUnpublish(post.cid)}
												className="cursor-pointer text-xs text-yellow-600 hover:underline dark:text-yellow-400"
											>
												Unpublish
											</button>
										) : (
											<button
												type="button"
												onClick={() => void handlePublish(post.cid)}
												className="cursor-pointer text-xs text-green-600 hover:underline dark:text-green-400"
											>
												Publish
											</button>
										)}
										<button
											type="button"
											onClick={() => void handleDelete(post.cid)}
											className="cursor-pointer text-xs text-red-600 hover:underline dark:text-red-400"
										>
											Delete
										</button>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	)
}
