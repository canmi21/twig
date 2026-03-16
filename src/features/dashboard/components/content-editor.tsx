import type { ContentForEdit } from '~/features/dashboard/server/dashboard'
import { useContentEditor } from '~/features/dashboard/hooks/use-content-editor'
import { ContentEditorActions } from './content-editor-actions'
import { ContentEditorFields } from './content-editor-fields'
import { ContentEditorPreview } from './content-editor-preview'
import { ContentEditorToolbar } from './content-editor-toolbar'

interface ContentEditorProps {
	initial?: ContentForEdit | null
	defaultType?: string
}

export function ContentEditor({ initial, defaultType }: ContentEditorProps) {
	const editor = useContentEditor({ initial, defaultType })

	return (
		<div className="flex h-[calc(100vh-4rem)] flex-col">
			<ContentEditorFields form={editor.form} actions={editor.actions} />
			<ContentEditorToolbar
				uploading={editor.ui.uploading}
				showPreview={editor.ui.showPreview}
				onUploadImage={editor.actions.uploadImage}
				onTogglePreview={editor.actions.togglePreview}
			/>
			<ContentEditorPreview
				textareaRef={editor.textareaRef}
				content={editor.form.content}
				showPreview={editor.ui.showPreview}
				effectivePreviewHtml={editor.ui.effectivePreviewHtml}
				onContentChange={editor.actions.setContent}
			/>
			<ContentEditorActions
				saving={editor.ui.saving}
				deleting={editor.ui.deleting}
				confirmDelete={editor.ui.confirmDelete}
				hasExistingContent={editor.ui.hasExistingContent}
				onSaveDraft={editor.actions.saveDraft}
				onPublish={editor.actions.publish}
				onDelete={editor.actions.deleteContent}
			/>
		</div>
	)
}
