import { Eye, EyeOff, Upload } from 'lucide-react'

export function ContentEditorToolbar({
	uploading,
	showPreview,
	onUploadImage,
	onTogglePreview,
}: {
	uploading: boolean
	showPreview: boolean
	onUploadImage: () => void
	onTogglePreview: () => void
}) {
	return (
		<div className="border-border-default flex items-center gap-2 border-b py-2">
			<button
				type="button"
				onClick={onUploadImage}
				disabled={uploading}
				className="text-content-secondary hover:text-content-heading inline-flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors disabled:opacity-50"
			>
				<Upload className="size-3.5" />
				{uploading ? 'Uploading...' : 'Upload image'}
			</button>
			<div className="flex-1" />
			<button
				type="button"
				onClick={onTogglePreview}
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
	)
}
