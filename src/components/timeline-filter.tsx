import { Link, useSearch } from '@tanstack/react-router'
import { CONTENT_TYPES, type ContentType } from '~/server/database/constants'

const filterTypes: Array<{ value: ContentType | undefined; label: string }> = [
	{ value: undefined, label: 'All' },
	...CONTENT_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) })),
]

export function TimelineFilter() {
	const search = useSearch({ from: '/' })
	const activeType = (search as { type?: string }).type

	return (
		<nav
			className="border-border-default mb-6 flex gap-1.5 overflow-x-auto border-b pb-3"
			aria-label="Content filter"
		>
			{filterTypes.map(({ value, label }) => {
				const isActive = activeType === value || (!activeType && !value)
				return (
					<Link
						key={label}
						to="/"
						search={(prev) => ({
							...prev,
							type: value,
							page: undefined,
						})}
						className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium no-underline transition-colors ${
							isActive
								? 'bg-primary text-primary-foreground'
								: 'text-content-secondary hover:bg-elevated'
						}`}
					>
						{label}
					</Link>
				)
			})}
		</nav>
	)
}
