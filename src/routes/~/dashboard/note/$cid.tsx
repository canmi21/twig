/* src/routes/~/dashboard/note/$cid.tsx */

import { useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { resolveImageUrl } from '~/lib/image'
import { getNote, updateNote, uploadImage } from '~/features/content/server'

export const Route = createFileRoute('/~/dashboard/note/$cid')({
	loader: ({ params }) => getNote({ data: { cid: params.cid } }),
	component: EditNotePage,
})

function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.addEventListener('load', () => {
			const result = reader.result as string
			resolve(result.split(',')[1])
		})
		reader.addEventListener('error', () => reject(new Error('Failed to read file')))
		reader.readAsDataURL(file)
	})
}

function EditNotePage() {
	const note = Route.useLoaderData()
	const navigate = useNavigate()

	const [text, setText] = useState(note.text)
	const [images, setImages] = useState<string[]>(note.images ? JSON.parse(note.images) : [])
	const [uploading, setUploading] = useState(false)
	const [submitting, setSubmitting] = useState(false)

	async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
		const { files } = event.target
		if (!files || files.length === 0) {
			return
		}
		if (images.length + files.length > 4) {
			alert('Maximum 4 images allowed')
			return
		}

		setUploading(true)
		try {
			const paths = await Promise.all(
				[...files].map(async (file) => {
					const base64 = await fileToBase64(file)
					const result = await uploadImage({
						data: { base64, type: file.type, size: file.size },
					})
					return result.path
				}),
			)
			setImages((prev) => [...prev, ...paths])
		} catch (error) {
			alert(error instanceof Error ? error.message : 'Upload failed')
		} finally {
			setUploading(false)
			event.target.value = ''
		}
	}

	function removeImage(index: number) {
		setImages((prev) => prev.filter((_path, idx) => idx !== index))
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setSubmitting(true)

		try {
			await updateNote({
				data: {
					cid: note.cid,
					text,
					images,
				},
			})
			await navigate({ to: '/~/dashboard/notes' })
		} catch (error) {
			alert(error instanceof Error ? error.message : 'Failed to save')
			setSubmitting(false)
		}
	}

	return (
		<div className="max-w-2xl">
			<h2 className="text-content-heading mb-6 text-lg font-semibold">Edit Note</h2>

			<form onSubmit={(ev) => void handleSubmit(ev)} className="space-y-4">
				<div>
					<label className="text-content-secondary mb-1 block text-sm">Text</label>
					<textarea
						value={text}
						onChange={(ev) => setText(ev.target.value)}
						required
						rows={6}
						className="border-border-subtle bg-surface w-full rounded-md border px-3 py-2 text-sm"
					/>
				</div>

				<div>
					<label className="text-content-secondary mb-1 block text-sm">
						Images ({images.length}/4)
					</label>

					{images.length > 0 && (
						<div className="mt-2 flex flex-wrap gap-2">
							{images.map((path, idx) => (
								<div key={path} className="group relative">
									<img
										src={resolveImageUrl(path)}
										alt=""
										className="h-20 w-20 rounded-md object-cover"
									/>
									<button
										type="button"
										onClick={() => removeImage(idx)}
										className="absolute -top-1.5 -right-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-red-600 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
									>
										x
									</button>
								</div>
							))}
						</div>
					)}

					{images.length < 4 && (
						<label className="text-content-secondary mt-2 inline-block cursor-pointer text-xs hover:underline">
							{uploading ? 'Uploading...' : 'Add images'}
							<input
								type="file"
								accept="image/jpeg,image/png,image/webp,image/gif"
								multiple
								onChange={(ev) => void handleUpload(ev)}
								className="hidden"
								disabled={uploading}
							/>
						</label>
					)}
				</div>

				<div className="flex gap-3 pt-2">
					<button
						type="submit"
						disabled={submitting || !text.trim()}
						className="bg-primary text-on-primary cursor-pointer rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
					>
						{submitting ? 'Saving...' : 'Save Changes'}
					</button>
					<button
						type="button"
						onClick={() => void navigate({ to: '/~/dashboard/notes' })}
						className="text-content-secondary cursor-pointer rounded-md px-4 py-2 text-sm hover:underline"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	)
}