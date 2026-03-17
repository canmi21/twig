import { useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getPost, updatePost } from '~/features/content/server'

export const Route = createFileRoute('/~/dashboard/post/$cid')({
	loader: ({ params }) => getPost({ data: { cid: params.cid } }),
	component: EditPostPage,
})

function parseTags(raw: string | null): string {
	if (!raw) {
		return ''
	}
	return (JSON.parse(raw) as string[]).join(', ')
}

function EditPostPage() {
	const post = Route.useLoaderData()
	const navigate = useNavigate()

	const [title, setTitle] = useState(post.title)
	const [slug, setSlug] = useState(post.slug)
	const [content, setContent] = useState(post.content)
	const [summary, setSummary] = useState(post.summary ?? '')
	const [tags, setTags] = useState(parseTags(post.tags))
	const [submitting, setSubmitting] = useState(false)

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setSubmitting(true)

		const tagsArray = tags
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean)

		await updatePost({
			data: {
				cid: post.cid,
				title,
				slug,
				content,
				summary: summary.trim() !== '' ? summary : undefined,
				tags: tagsArray,
			},
		})

		await navigate({ to: '/~/dashboard' })
	}

	return (
		<div className="max-w-2xl">
			<h2 className="text-content-heading mb-6 text-lg font-semibold">Edit Post</h2>

			<form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
				<div>
					<label className="text-content-secondary mb-1 block text-sm">Title</label>
					<input
						type="text"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						required
						className="border-border-subtle bg-surface w-full rounded-md border px-3 py-2 text-sm"
					/>
				</div>

				<div>
					<label className="text-content-secondary mb-1 block text-sm">Slug</label>
					<input
						type="text"
						value={slug}
						onChange={(e) => setSlug(e.target.value)}
						required
						className="border-border-subtle bg-surface w-full rounded-md border px-3 py-2 font-mono text-sm"
					/>
				</div>

				<div>
					<label className="text-content-secondary mb-1 block text-sm">Content</label>
					<textarea
						value={content}
						onChange={(e) => setContent(e.target.value)}
						required
						rows={16}
						className="border-border-subtle bg-surface w-full rounded-md border px-3 py-2 font-mono text-sm"
					/>
				</div>

				<div>
					<label className="text-content-secondary mb-1 block text-sm">Summary (optional)</label>
					<input
						type="text"
						value={summary}
						onChange={(e) => setSummary(e.target.value)}
						className="border-border-subtle bg-surface w-full rounded-md border px-3 py-2 text-sm"
					/>
				</div>

				<div>
					<label className="text-content-secondary mb-1 block text-sm">
						Tags (comma-separated)
					</label>
					<input
						type="text"
						value={tags}
						onChange={(e) => setTags(e.target.value)}
						placeholder="e.g. typescript, react, cloudflare"
						className="border-border-subtle bg-surface w-full rounded-md border px-3 py-2 text-sm"
					/>
				</div>

				<div className="flex gap-3 pt-2">
					<button
						type="submit"
						disabled={submitting}
						className="bg-primary text-on-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
					>
						{submitting ? 'Saving...' : 'Save Changes'}
					</button>
					<button
						type="button"
						onClick={() => void navigate({ to: '/~/dashboard' })}
						className="text-content-secondary rounded-md px-4 py-2 text-sm hover:underline"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	)
}
