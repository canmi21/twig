import { createFileRoute, Link } from '@tanstack/react-router'
import { FilePlus, StickyNote } from 'lucide-react'
import { getDashboardStats, type DashboardStats } from '~/server/functions/dashboard'

export const Route = createFileRoute('/dashboard/')({
	loader: async (): Promise<DashboardStats> => {
		return await getDashboardStats()
	},
	component: DashboardOverview,
})

function DashboardOverview() {
	const stats = Route.useLoaderData()

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<h2 className="text-content-heading text-xl font-semibold">Overview</h2>
				<div className="flex gap-2">
					<Link
						to="/dashboard/editor"
						search={{ type: 'post' }}
						className="bg-primary text-primary-contrast inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium no-underline transition-opacity hover:opacity-90"
					>
						<FilePlus className="size-4" />
						New Post
					</Link>
					<Link
						to="/dashboard/editor"
						search={{ type: 'note' }}
						className="border-border-default text-content-secondary hover:text-content-heading inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium no-underline transition-colors"
					>
						<StickyNote className="size-4" />
						New Note
					</Link>
				</div>
			</div>

			{/* Stats cards */}
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
				<StatCard label="Total" value={stats.totalCount} />
				<StatCard label="Drafts" value={stats.draftCount} highlight={stats.draftCount > 0} />
				{stats.countByType.map(({ type, count }) => (
					<StatCard key={type} label={type} value={count} />
				))}
			</div>

			{/* Recent items */}
			<section>
				<h3 className="text-content-heading mb-3 text-sm font-medium">Recent</h3>
				{stats.recentItems.length === 0 ? (
					<p className="text-content-tertiary text-sm">No content yet.</p>
				) : (
					<div className="border-border-default divide-border-default divide-y rounded-md border">
						{stats.recentItems.map((item) => (
							<Link
								key={item.id}
								to="/dashboard/edit/$id"
								params={{ id: item.id }}
								className="text-content-secondary hover:bg-surface-raised flex items-center justify-between px-4 py-3 no-underline transition-colors"
							>
								<div className="min-w-0 flex-1">
									<span className="text-content-heading text-sm font-medium">
										{item.title || 'Untitled'}
									</span>
									<span className="text-content-tertiary ml-2 text-xs">{item.type}</span>
								</div>
								<div className="flex shrink-0 items-center gap-2">
									{item.isDraft === 1 && (
										<span className="bg-warning/10 text-warning rounded px-1.5 py-0.5 text-xs font-medium">
											draft
										</span>
									)}
									<span className="text-content-tertiary text-xs">
										{item.createdAt.slice(0, 10)}
									</span>
								</div>
							</Link>
						))}
					</div>
				)}
			</section>
		</div>
	)
}

function StatCard({
	label,
	value,
	highlight,
}: {
	label: string
	value: number
	highlight?: boolean
}) {
	return (
		<div
			className={`border-border-default rounded-md border px-4 py-3 ${highlight ? 'bg-warning/5 border-warning/30' : ''}`}
		>
			<p className="text-content-tertiary text-xs capitalize">{label}</p>
			<p
				className={`text-2xl font-semibold ${highlight ? 'text-warning' : 'text-content-heading'}`}
			>
				{value}
			</p>
		</div>
	)
}
