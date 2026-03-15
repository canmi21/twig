import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getGuestbookEntries, type PaginatedGuestbook } from '~/server/functions/guestbook'
import { getPlatformStatus } from '~/server/functions/health'
import { GuestbookForm } from '~/components/guestbook-form'

export const Route = createFileRoute('/guestbook')({
	validateSearch: (search: Record<string, unknown>) => ({
		page: Number(search.page) || 1,
	}),
	loaderDeps: ({ search }) => search,
	loader: async ({ deps }): Promise<PaginatedGuestbook> => {
		await getPlatformStatus()
		return await getGuestbookEntries({ data: { page: deps.page } })
	},
	component: GuestbookPage,
})

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	})
}

function GuestbookPage() {
	const { entries, totalPages, currentPage } = Route.useLoaderData()
	const navigate = useNavigate()

	return (
		<section>
			<h1 className="text-content-heading mb-6 text-2xl font-semibold">Guestbook</h1>
			<GuestbookForm />
			<div className="space-y-4">
				{entries.map((entry) => (
					<div key={entry.id} className="border-border-default rounded-lg border p-4">
						<div className="flex items-center gap-2">
							<span className="text-content-heading text-sm font-medium">{entry.nickname}</span>
							{entry.website && (
								<a
									href={entry.website}
									target="_blank"
									rel="noopener noreferrer"
									className="text-primary text-xs hover:underline"
								>
									{new URL(entry.website).hostname}
								</a>
							)}
							<span className="text-content-tertiary text-xs">{formatDate(entry.createdAt)}</span>
						</div>
						<p className="text-content-primary mt-1 text-sm">{entry.content}</p>
					</div>
				))}
			</div>
			{entries.length === 0 && (
				<p className="text-content-secondary py-8 text-center">No messages yet. Be the first!</p>
			)}
			{totalPages > 1 && (
				<nav className="mt-8 flex items-center justify-center gap-4" aria-label="Pagination">
					<button
						type="button"
						disabled={currentPage <= 1}
						onClick={() => void navigate({ search: { page: currentPage - 1 } })}
						className="border-border-default text-content-primary hover:bg-elevated disabled:text-content-disabled rounded-md border px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
					>
						Previous
					</button>
					<span className="text-content-secondary text-sm">
						Page {currentPage} of {totalPages}
					</span>
					<button
						type="button"
						disabled={currentPage >= totalPages}
						onClick={() => void navigate({ search: { page: currentPage + 1 } })}
						className="border-border-default text-content-primary hover:bg-elevated disabled:text-content-disabled rounded-md border px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
					>
						Next
					</button>
				</nav>
			)}
		</section>
	)
}
