import type { RefObject } from 'react'

export function ContentEditorPreview({
	textareaRef,
	content,
	showPreview,
	effectivePreviewHtml,
	onContentChange,
}: {
	textareaRef: RefObject<HTMLTextAreaElement | null>
	content: string
	showPreview: boolean
	effectivePreviewHtml: string
	onContentChange: (value: string) => void
}) {
	return (
		<div className="flex min-h-0 flex-1 gap-0">
			<div className={`flex flex-col ${showPreview ? 'w-1/2' : 'w-full'}`}>
				<textarea
					ref={textareaRef}
					value={content}
					onChange={(event) => onContentChange(event.target.value)}
					placeholder="Write markdown here..."
					className="bg-surface text-content-primary placeholder:text-content-tertiary min-h-0 flex-1 resize-none p-4 font-mono text-sm leading-relaxed focus:outline-none"
					spellCheck={false}
				/>
			</div>

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
	)
}
