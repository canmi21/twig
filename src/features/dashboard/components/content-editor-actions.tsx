import { Save, Trash2 } from 'lucide-react'

export function ContentEditorActions({
	saving,
	deleting,
	confirmDelete,
	hasExistingContent,
	onSaveDraft,
	onPublish,
	onDelete,
}: {
	saving: boolean
	deleting: boolean
	confirmDelete: boolean
	hasExistingContent: boolean
	onSaveDraft: () => void
	onPublish: () => void
	onDelete: () => void
}) {
	return (
		<div className="border-border-default flex items-center gap-2 border-t pt-4">
			<button
				type="button"
				onClick={onSaveDraft}
				disabled={saving}
				className="border-border-default text-content-secondary hover:text-content-heading inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
			>
				<Save className="size-4" />
				{saving ? 'Saving...' : 'Save Draft'}
			</button>
			<button
				type="button"
				onClick={onPublish}
				disabled={saving}
				className="bg-primary text-primary-contrast inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
			>
				<Save className="size-4" />
				{saving ? 'Saving...' : 'Publish'}
			</button>

			<div className="flex-1" />

			{hasExistingContent && (
				<button
					type="button"
					onClick={onDelete}
					disabled={deleting}
					className="text-error hover:bg-error/10 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
				>
					<Trash2 className="size-4" />
					{confirmDelete ? 'Confirm delete?' : deleting ? 'Deleting...' : 'Delete'}
				</button>
			)}
		</div>
	)
}
