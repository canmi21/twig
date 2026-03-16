import type { ContentType } from '~/server/database/constants'

export function ContentEditorFields({
	form,
	actions,
}: {
	form: {
		type: ContentType
		title: string
		slug: string
		summary: string
		coverImage: string
		tags: string
	}
	actions: {
		setType: (value: ContentType) => void
		setTitle: (value: string) => void
		setSlug: (value: string) => void
		setSummary: (value: string) => void
		setCoverImage: (value: string) => void
		setTags: (value: string) => void
	}
}) {
	return (
		<div className="border-border-default space-y-3 border-b pb-4">
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<FieldGroup label="Type">
					<select
						value={form.type}
						onChange={(event) => actions.setType(event.target.value as ContentType)}
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
						value={form.title}
						onChange={(event) => actions.setTitle(event.target.value)}
						placeholder="Title"
						className="field-input"
					/>
				</FieldGroup>
			</div>

			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<FieldGroup label="Slug" className="sm:col-span-2">
					<input
						type="text"
						value={form.slug}
						onChange={(event) => actions.setSlug(event.target.value)}
						placeholder="url-slug"
						className="field-input"
					/>
				</FieldGroup>
				<FieldGroup label="Tags" className="sm:col-span-2">
					<input
						type="text"
						value={form.tags}
						onChange={(event) => actions.setTags(event.target.value)}
						placeholder="tag1, tag2"
						className="field-input"
					/>
				</FieldGroup>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<FieldGroup label="Summary">
					<input
						type="text"
						value={form.summary}
						onChange={(event) => actions.setSummary(event.target.value)}
						placeholder="Brief summary"
						className="field-input"
					/>
				</FieldGroup>
				<FieldGroup label="Cover image">
					<input
						type="text"
						value={form.coverImage}
						onChange={(event) => actions.setCoverImage(event.target.value)}
						placeholder="/uploads/image.png"
						className="field-input"
					/>
				</FieldGroup>
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
