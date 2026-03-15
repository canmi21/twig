import { createFileRoute } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { getLinks, type LinkItem } from '~/server/functions/links'
import { getPlatformStatus } from '~/server/functions/health'

export const Route = createFileRoute('/links')({
	loader: async (): Promise<LinkItem[]> => {
		await getPlatformStatus()
		return await getLinks()
	},
	component: LinksPage,
})

function LinksPage() {
	const linkItems = Route.useLoaderData()

	const grouped = linkItems.reduce<Record<string, LinkItem[]>>((acc, link) => {
		const cat = link.category
		if (!acc[cat]) acc[cat] = []
		acc[cat].push(link)
		return acc
	}, {})

	return (
		<section>
			<h1 className="text-content-heading mb-6 text-2xl font-semibold">Links</h1>
			<div className="space-y-8">
				{Object.entries(grouped).map(([category, items]) => (
					<div key={category}>
						<h2 className="text-content-heading border-border-default mb-3 border-b pb-2 text-lg font-medium capitalize">
							{category}
						</h2>
						<div className="space-y-3">
							{items.map((link) => (
								<div key={link.id} className="flex items-start gap-3">
									<ExternalLink className="text-content-tertiary mt-0.5 size-4 shrink-0" />
									<div>
										<a
											href={link.url}
											target="_blank"
											rel="noopener noreferrer"
											className="text-primary hover:text-accent-hover font-medium transition-colors"
										>
											{link.name}
										</a>
										{link.description && (
											<p className="text-content-secondary text-sm">{link.description}</p>
										)}
									</div>
								</div>
							))}
						</div>
					</div>
				))}
			</div>
			{linkItems.length === 0 && (
				<p className="text-content-secondary py-12 text-center">No links yet.</p>
			)}
		</section>
	)
}
