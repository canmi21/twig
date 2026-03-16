import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Save, Trash2, Eye, EyeOff, Upload } from 'lucide-react'
import {
	saveContent,
	deleteContent,
	renderPreview,
	uploadImage,
	type ContentForEdit,
	type SaveContentInput,
} from '~/features/dashboard/server/dashboard'
import type { ContentType } from '~/server/database/constants'

const DEBOUNCE_MS = 500

interface ContentEditorProps {
	initial?: ContentForEdit | null
	defaultType?: string
}

function slugFromTitle(t: string) {
	return t
		.toLowerCase()
		.replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
		.replace(/^-|-$/g, '')
}

export function ContentEditor({ initial, defaultType }: ContentEditorProps) {
	const navigate = useNavigate()
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const previewTimerRef = useRef<ReturnType<typeof setTimeout>>()

	// Form state
	const [type, setType] = useState<ContentType>(
		(initial?.type ?? defaultType ?? 'post') as ContentType,
	)
	const [title, setTitle] = useState(initial?.title ?? '')
	const [slug, setSlug] = useState(initial?.slug ?? '')
	const [summary, setSummary] = useState(initial?.summary ?? '')
	const [coverImage, setCoverImage] = useState(initial?.coverImage ?? '')
	const [tags, setTags] = useState(initial?.tags.join(', ') ?? '')
	const [content, setContent] = useState(initial?.content ?? '')

	// UI state
	const [previewHtml, setPreviewHtml] = useState('')
	const [showPreview, setShowPreview] = useState(true)
	const [saving, setSaving] = useState(false)
	const [deleting, setDeleting] = useState(false)
	const [confirmDelete, setConfirmDelete] = useState(false)
	const [uploading, setUploading] = useState(false)

	function handleTitleChange(value: string) {
		setTitle(value)
		if (!initial?.slug) {
			setSlug(slugFromTitle(value))
		}
	}

	// Clear preview when hidden. Derive rather than using effect setState.
	const effectivePreviewHtml = showPreview && content.trim() ? previewHtml : ''

	// Debounced server preview render
	useEffect(() => {
		if (!showPreview || !content.trim()) return

		clearTimeout(previewTimerRef.current)
		previewTimerRef.current = setTimeout(() => {
			void renderPreview({ data: { markdown: content } }).then(
				(result) => setPreviewHtml(result.html),
				() => setPreviewHtml('<p style="color:red">Preview error</p>'),
			)
		}, DEBOUNCE_MS)

		return () => clearTimeout(previewTimerRef.current)
	}, [content, showPreview])

	function handleSave(asDraft: number) {
		setSaving(true)
		const input: SaveContentInput = {
			id: initial?.id,
			type,
			title,
			slug,
			content,
			summary: summary || undefined,
			tags: tags
				.split(',')
				.map((t) => t.trim())
				.filter(Boolean),
			coverImage: coverImage || undefined,
			isDraft: asDraft,
		}
		void saveContent({ data: input })
			.then((result) => {
				if (!initial?.id) {
					void navigate({
						to: '/dashboard/edit/$id',
						params: { id: result.id },
						replace: true,
					})
				}
			})
			.finally(() => setSaving(false))
	}

	function handleDelete() {
		if (!initial?.id) return
		if (!confirmDelete) {
			setConfirmDelete(true)
			return
		}
		setDeleting(true)
		void deleteContent({ data: { id: initial.id } })
			.then(() => void navigate({ to: '/dashboard' }))
			.finally(() => {
				setDeleting(false)
				setConfirmDelete(false)
			})
	}

	function handleUploadImage() {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = 'image/*'
		input.addEventListener('change', () => {
			const file = input.files?.[0]
			if (!file) return

			setUploading(true)
			void file
				.arrayBuffer()
				.then((buffer) => {
					const base64 = btoa(
						new Uint8Array(buffer).reduce((s, b) => s + String.fromCharCode(b), ''),
					)
					return uploadImage({
						data: { base64, filename: file.name, contentType: file.type },
					})
				})
				.then((result) => {
					const textarea = textareaRef.current
					if (textarea) {
						const { selectionStart } = textarea
						const before = content.slice(0, selectionStart)
						const after = content.slice(selectionStart)
						const insertion = `![${file.name}](${result.url})`
						setContent(before + insertion + after)
					}
				})
				.finally(() => setUploading(false))
		})
		input.click()
	}

	return (
		<div className="flex h-[calc(100vh-4rem)] flex-col">
			{/* Top form fields */}
			<div className="border-border-default space-y-3 border-b pb-4">
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					<FieldGroup label="Type">
						<select
							value={type}
							onChange={(e) => setType(e.target.value as ContentType)}
							className="field-input"
						>
							<option value="post">Post</option>
							<option value="note">Note</option>
							<option value="thought">Thought</option>
							<option value="snippet">Snippet</option>
						</select>
					</FieldGroup>

					<FieldGroup label="Title" className="sm:col-span-3">
						<input
							type="text"
							value={title}
							onChange={(e) => handleTitleChange(e.target.value)}
							placeholder="Title"
							className="field-input"
						/>
					</FieldGroup>
				</div>

				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					<FieldGroup label="Slug" className="sm:col-span-2">
						<input
							type="text"
							value={slug}
							onChange={(e) => setSlug(e.target.value)}
							placeholder="url-slug"
							className="field-input"
						/>
					</FieldGroup>
					<FieldGroup label="Tags" className="sm:col-span-2">
						<input
							type="text"
							value={tags}
							onChange={(e) => setTags(e.target.value)}
							placeholder="tag1, tag2"
							className="field-input"
						/>
					</FieldGroup>
				</div>

				<div className="grid grid-cols-2 gap-3">
					<FieldGroup label="Summary">
						<input
							type="text"
							value={summary}
							onChange={(e) => setSummary(e.target.value)}
							placeholder="Brief summary"
							className="field-input"
						/>
					</FieldGroup>
					<FieldGroup label="Cover image">
						<input
							type="text"
							value={coverImage}
							onChange={(e) => setCoverImage(e.target.value)}
							placeholder="/uploads/image.png"
							className="field-input"
						/>
					</FieldGroup>
				</div>
			</div>

			{/* Toolbar */}
			<div className="border-border-default flex items-center gap-2 border-b py-2">
				<button
					type="button"
					onClick={handleUploadImage}
					disabled={uploading}
					className="text-content-secondary hover:text-content-heading inline-flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors disabled:opacity-50"
				>
					<Upload className="size-3.5" />
					{uploading ? 'Uploading...' : 'Upload image'}
				</button>
				<div className="flex-1" />
				<button
					type="button"
					onClick={() => setShowPreview((v) => !v)}
					className="text-content-secondary hover:text-content-heading inline-flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors"
				>
					{showPreview ? (
						<>
							<EyeOff className="size-3.5" /> Hide preview
						</>
					) : (
						<>
							<Eye className="size-3.5" /> Show preview
						</>
					)}
				</button>
			</div>

			{/* Split pane: editor + preview */}
			<div className="flex min-h-0 flex-1 gap-0">
				{/* Editor */}
				<div className={`flex flex-col ${showPreview ? 'w-1/2' : 'w-full'}`}>
					<textarea
						ref={textareaRef}
						value={content}
						onChange={(e) => setContent(e.target.value)}
						placeholder="Write markdown here..."
						className="bg-surface text-content-primary placeholder:text-content-tertiary min-h-0 flex-1 resize-none p-4 font-mono text-sm leading-relaxed focus:outline-none"
						spellCheck={false}
					/>
				</div>

				{/* Preview -- HTML generated server-side by renderMarkdown (marked + shiki) */}
				{showPreview && (
					<div className="border-border-default w-1/2 overflow-y-auto border-l p-4">
						{effectivePreviewHtml ? (
							<div
								className="prose prose-sm max-w-none"
								dangerouslySetInnerHTML={{ __html: effectivePreviewHtml }}
							/>
						) : (
							<p className="text-content-tertiary text-sm">Preview will appear here...</p>
						)}
					</div>
				)}
			</div>

			{/* Bottom actions */}
			<div className="border-border-default flex items-center gap-2 border-t pt-4">
				<button
					type="button"
					onClick={() => handleSave(1)}
					disabled={saving}
					className="border-border-default text-content-secondary hover:text-content-heading inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
				>
					<Save className="size-4" />
					{saving ? 'Saving...' : 'Save Draft'}
				</button>
				<button
					type="button"
					onClick={() => handleSave(0)}
					disabled={saving}
					className="bg-primary text-primary-contrast inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
				>
					<Save className="size-4" />
					{saving ? 'Saving...' : 'Publish'}
				</button>

				<div className="flex-1" />

				{initial?.id && (
					<button
						type="button"
						onClick={handleDelete}
						disabled={deleting}
						className="text-error hover:bg-error/10 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
					>
						<Trash2 className="size-4" />
						{confirmDelete ? 'Confirm delete?' : deleting ? 'Deleting...' : 'Delete'}
					</button>
				)}
			</div>
		</div>
	)
}

function FieldGroup({
	label,
	children,
	className,
}: {
	label: string
	children: React.ReactNode
	className?: string
}) {
	return (
		<label className={`block ${className ?? ''}`}>
			<span className="text-content-tertiary mb-1 block text-xs">{label}</span>
			{children}
		</label>
	)
}
