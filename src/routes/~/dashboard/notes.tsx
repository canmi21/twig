import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { resolveImageUrl } from '~/lib/image'
import {
	createNote,
	deleteNote,
	listNotes,
	publishNote,
	unpublishNote,
	uploadImage,
} from '~/features/content/server'

export const Route = createFileRoute('/~/dashboard/notes')({
	loader: () => listNotes(),
	component: NotesPage,
})

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	})
}

function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.addEventListener('load', () => {
			const result = reader.result as string
			// Strip the data:...;base64, prefix
			resolve(result.split(',')[1])
		})
		reader.addEventListener('error', () => reject(new Error('Failed to read file')))
		reader.readAsDataURL(file)
	})
}

// ---------------------------------------------------------------------------
// Compose area
// ---------------------------------------------------------------------------

function NoteComposer({ onCreated }: { onCreated: () => void }) {
	const [text, setText] = useState('')
	const [images, setImages] = useState<string[]>([])
	const [uploading, setUploading] = useState(false)
	const [saving, setSaving] = useState(false)

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

	async function handleSave(publish: boolean) {
		if (!text.trim()) {
			return
		}
		setSaving(true)
		try {
			const result = await createNote({
				data: { text, images: images.length > 0 ? images : undefined },
			})
			if (publish) {
				await publishNote({ data: { cid: result.cid } })
			}
			setText('')
			setImages([])
			onCreated()
		} catch (error) {
			alert(error instanceof Error ? error.message : 'Failed to save note')
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className="border-border-subtle rounded-lg border p-4">
			<textarea
				value={text}
				onChange={(ev) => setText(ev.target.value)}
				placeholder="Write a note..."
				rows={3}
				className="bg-sunken text-content-primary placeholder:text-content-disabled w-full resize-y rounded-md border-0 p-3 text-sm focus:ring-0 focus:outline-none"
			/>

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

			<div className="mt-3 flex items-center gap-3">
				<label className="text-content-secondary cursor-pointer text-xs hover:underline">
					{uploading ? 'Uploading...' : 'Add images'}
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp,image/gif"
						multiple
						onChange={(ev) => void handleUpload(ev)}
						className="hidden"
						disabled={uploading || images.length >= 4}
					/>
				</label>

				<div className="ml-auto flex gap-2">
					<button
						type="button"
						onClick={() => void handleSave(false)}
						disabled={saving || !text.trim()}
						className="border-border-subtle cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
					>
						Save Draft
					</button>
					<button
						type="button"
						onClick={() => void handleSave(true)}
						disabled={saving || !text.trim()}
						className="bg-primary text-on-primary cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50"
					>
						Publish
					</button>
				</div>
			</div>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Note list
// ---------------------------------------------------------------------------

function NotesPage() {
	const noteList = Route.useLoaderData()
	const router = useRouter()

	async function handlePublish(cid: string) {
		await publishNote({ data: { cid } })
		await router.invalidate()
	}

	async function handleUnpublish(cid: string) {
		await unpublishNote({ data: { cid } })
		await router.invalidate()
	}

	async function handleDelete(cid: string) {
		if (!confirm('Delete this note?')) {
			return
		}
		await deleteNote({ data: { cid } })
		await router.invalidate()
	}

	return (
		<div>
			<h2 className="text-content-heading mb-4 text-lg font-semibold">Notes</h2>

			<NoteComposer onCreated={() => void router.invalidate()} />

			<div className="mt-6">
				{noteList.length === 0 ? (
					<p className="text-content-secondary text-sm">No notes yet.</p>
				) : (
					<div className="flex flex-col gap-3">
						{noteList.map((note) => {
							const imgs: string[] = note.images ? JSON.parse(note.images) : []
							return (
								<div key={note.cid} className="border-border-subtle rounded-lg border p-4">
									<div className="flex items-start justify-between gap-4">
										<p className="text-content-primary text-sm whitespace-pre-wrap">{note.text}</p>
										<span
											className={
												note.status === 'published'
													? 'shrink-0 rounded bg-green-500/10 px-2 py-0.5 text-xs text-green-700 dark:text-green-400'
													: 'shrink-0 rounded bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-700 dark:text-yellow-400'
											}
										>
											{note.status}
										</span>
									</div>

									{imgs.length > 0 && (
										<div className="mt-2 flex flex-wrap gap-2">
											{imgs.map((path) => (
												<img
													key={path}
													src={resolveImageUrl(path)}
													alt=""
													className="h-20 w-20 rounded-md object-cover"
												/>
											))}
										</div>
									)}

									<div className="mt-3 flex items-center gap-3">
										<time className="text-content-tertiary text-xs">
											{formatDate(note.createdAt)}
										</time>
										<div className="ml-auto flex gap-3">
											<Link
												to="/~/dashboard/note/$cid"
												params={{ cid: note.cid }}
												className="text-primary text-xs hover:underline"
											>
												Edit
											</Link>
											{note.status === 'published' ? (
												<button
													type="button"
													onClick={() => void handleUnpublish(note.cid)}
													className="cursor-pointer text-xs text-yellow-600 hover:underline dark:text-yellow-400"
												>
													Unpublish
												</button>
											) : (
												<button
													type="button"
													onClick={() => void handlePublish(note.cid)}
													className="cursor-pointer text-xs text-green-600 hover:underline dark:text-green-400"
												>
													Publish
												</button>
											)}
											<button
												type="button"
												onClick={() => void handleDelete(note.cid)}
												className="cursor-pointer text-xs text-red-600 hover:underline dark:text-red-400"
											>
												Delete
											</button>
										</div>
									</div>
								</div>
							)
						})}
					</div>
				)}
			</div>
		</div>
	)
}
