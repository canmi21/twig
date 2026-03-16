export function TagList({ tags }: { tags: string[] }) {
	if (tags.length === 0) return null

	return (
		<div className="flex flex-wrap gap-1.5">
			{tags.map((tag) => (
				<span
					key={tag}
					className="bg-elevated text-content-secondary rounded-full px-2 py-0.5 text-xs"
				>
					#{tag}
				</span>
			))}
		</div>
	)
}
