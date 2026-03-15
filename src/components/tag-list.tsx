import { Link } from '@tanstack/react-router'

export function TagList({ tags }: { tags: string[] }) {
	if (tags.length === 0) return null

	return (
		<div className="flex flex-wrap gap-1.5">
			{tags.map((tag) => (
				<Link
					key={tag}
					to="/"
					search={{ tag }}
					className="bg-elevated text-content-secondary hover:text-accent-on-subtle hover:bg-accent-subtle rounded-full px-2 py-0.5 text-xs no-underline transition-colors"
				>
					#{tag}
				</Link>
			))}
		</div>
	)
}
