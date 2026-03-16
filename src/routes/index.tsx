import { createFileRoute, getRouteApi, Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { getTimelineCursor } from '~/features/content/server/content'
import type { CursorTimeline } from '~/features/content/server/types'
import { SiteFooter } from '~/features/site/components/site-footer'
import { getPlatformStatus } from '~/features/platform/server/health'
import { TimelineFeed } from '~/features/timeline/components/timeline-feed'
import {
	buildTimelineViewModel,
	getTimelineReadMoreTarget,
} from '~/features/timeline/lib/view-model'

const HOME_LIMIT = 20

export const Route = createFileRoute('/')({
	loader: async (): Promise<CursorTimeline> => {
		await getPlatformStatus()
		return await getTimelineCursor({ data: { limit: HOME_LIMIT } })
	},
	component: HomePage,
})

const rootApi = getRouteApi('__root__')

function HomePage() {
	const { items, nextCursor } = Route.useLoaderData()
	const { settings } = rootApi.useLoaderData()
	const viewModel = buildTimelineViewModel(items)
	const readMoreTarget = getTimelineReadMoreTarget(items, viewModel.anchorMap)

	return (
		<section>
			<TimelineFeed viewModel={viewModel} />

			{/* read more -- small pill linking to full timeline */}
			{nextCursor && (
				<div className="mt-8 flex justify-center">
					<Link
						to="/timeline"
						search={readMoreTarget.at ? { at: readMoreTarget.at } : {}}
						hash={readMoreTarget.hash}
						className="border-border-default text-content-secondary hover:text-content-heading hover:border-border-strong inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-medium no-underline transition-colors"
					>
						Read more
						<ArrowRight className="size-3" />
					</Link>
				</div>
			)}

			<SiteFooter settings={settings} />
		</section>
	)
}
