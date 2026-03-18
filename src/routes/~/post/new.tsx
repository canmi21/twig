/* src/routes/~/post/new.tsx */

import { useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { createPost } from '~/features/content/server'

export const Route = createFileRoute('/~/post/new')({
	component: NewPostPage,
})

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replaceAll(/[^a-z0-9]+/g, '-')
		.replaceAll(/^-|-$/g, '')
}

function NewPostPage() {
	const navigate = useNavigate()

	const [title, setTitle] = useState('')
	const [slug, setSlug] = useState('')
	const [slugTouched, setSlugTouched] = useState(false)
	const [content, setContent] = useState('')
	const [summary, setSummary] = useState('')
	const [tags, setTags] = useState('')
	const [submitting, setSubmitting] = useState(false)

	function handleTitleChange(value: string) {
		setTitle(value)
		if (!slugTouched) {
			setSlug(slugify(value))
		}
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setSubmitting(true)

		const tagsArray = tags
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean)

		await createPost({
			data: {
				title,
				slug,
				content,
				summary: summary.trim() !== '' ? summary : undefined,
				tags: tagsArray.length > 0 ? tagsArray : undefined,
			},
		})

		await navigate({ to: '/~' })
	}

	return (
		<div className="max-w-2xl">
			<h2 className="text-content-heading mb-6 text-lg font-semibold">New Post</h2>

			<form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
				<div>
					<label className="text-content-secondary mb-1 block text-sm">Title</label>
					<input
						type="text"
						value={title}
						onChange={(e) => handleTitleChange(e.target.value)}
						required
						className="border-border-subtle bg-surface w-full rounded-md border px-3 py-2 text-sm"
					/>
				</div>

				<div>
					<label className="text-content-secondary mb-1 block text-sm">Slug</label>
					<input
						type="text"
						value={slug}
						onChange={(e) => {
							setSlugTouched(true)
							setSlug(e.target.value)
						}}
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
						Tags (comma-separated, optional)
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
						{submitting ? 'Creating...' : 'Create Post'}
					</button>
					<button
						type="button"
						onClick={() => void navigate({ to: '/~' })}
						className="text-content-secondary rounded-md px-4 py-2 text-sm hover:underline"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	)
}
