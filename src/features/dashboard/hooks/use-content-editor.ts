import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
	deleteContent,
	renderPreview,
	saveContent,
	uploadImage,
} from '~/features/dashboard/server/dashboard'
import {
	buildSaveContentInput,
	fileToBase64,
	insertMarkdownImage,
	PREVIEW_DEBOUNCE_MS,
	slugFromTitle,
} from '~/features/dashboard/lib/content-editor'
import type { ContentForEdit, SaveContentInput } from '~/features/dashboard/server/types'
import type { ContentType } from '~/server/database/constants'

interface UseContentEditorOptions {
	initial?: ContentForEdit | null
	defaultType?: string
}

export function useContentEditor({ initial, defaultType }: UseContentEditorOptions) {
	const navigate = useNavigate()
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const previewTimerRef = useRef<ReturnType<typeof setTimeout>>()

	const [type, setType] = useState<ContentType>(
		(initial?.type ?? defaultType ?? 'post') as ContentType,
	)
	const [title, setTitle] = useState(initial?.title ?? '')
	const [slug, setSlug] = useState(initial?.slug ?? '')
	const [summary, setSummary] = useState(initial?.summary ?? '')
	const [coverImage, setCoverImage] = useState(initial?.coverImage ?? '')
	const [tags, setTags] = useState(initial?.tags.join(', ') ?? '')
	const [content, setContent] = useState(initial?.content ?? '')

	const [previewHtml, setPreviewHtml] = useState('')
	const [showPreview, setShowPreview] = useState(true)
	const [saving, setSaving] = useState(false)
	const [deleting, setDeleting] = useState(false)
	const [confirmDelete, setConfirmDelete] = useState(false)
	const [uploading, setUploading] = useState(false)

	const effectivePreviewHtml = showPreview && content.trim() ? previewHtml : ''

	useEffect(() => {
		if (!showPreview || !content.trim()) return

		clearTimeout(previewTimerRef.current)
		previewTimerRef.current = setTimeout(() => {
			void renderPreview({ data: { markdown: content } }).then(
				(result) => setPreviewHtml(result.html),
				() => setPreviewHtml('<p style="color:red">Preview error</p>'),
			)
		}, PREVIEW_DEBOUNCE_MS)

		return () => clearTimeout(previewTimerRef.current)
	}, [content, showPreview])

	function handleTitleChange(value: string) {
		setTitle(value)
		if (!initial?.slug) {
			setSlug(slugFromTitle(value))
		}
	}

	function buildInput(asDraft: number): SaveContentInput {
		return {
			...buildSaveContentInput({
				id: initial?.id,
				type,
				title,
				slug,
				content,
				summary,
				tags,
				coverImage,
			}),
			isDraft: asDraft,
		}
	}

	function save(asDraft: number) {
		setSaving(true)
		void saveContent({ data: buildInput(asDraft) })
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

	function remove() {
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

	function togglePreview() {
		setShowPreview((value) => !value)
	}

	async function uploadSelectedImage(file: File) {
		setUploading(true)

		try {
			const result = await uploadImage({
				data: {
					base64: await fileToBase64(file),
					filename: file.name,
					contentType: file.type,
				},
			})

			const textarea = textareaRef.current
			if (!textarea) return

			setContent((current) =>
				insertMarkdownImage(current, textarea.selectionStart, file.name, result.url),
			)
		} finally {
			setUploading(false)
		}
	}

	function requestImageUpload() {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = 'image/*'
		input.addEventListener('change', () => {
			const file = input.files?.[0]
			if (!file) return
			void uploadSelectedImage(file)
		})
		input.click()
	}

	return {
		textareaRef,
		form: {
			type,
			title,
			slug,
			summary,
			coverImage,
			tags,
			content,
		},
		ui: {
			effectivePreviewHtml,
			showPreview,
			saving,
			deleting,
			confirmDelete,
			uploading,
			hasExistingContent: Boolean(initial?.id),
		},
		actions: {
			setType,
			setTitle: handleTitleChange,
			setSlug,
			setSummary,
			setCoverImage,
			setTags,
			setContent,
			togglePreview,
			saveDraft: () => save(1),
			publish: () => save(0),
			deleteContent: remove,
			uploadImage: requestImageUpload,
		},
	}
}
