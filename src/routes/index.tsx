/* src/routes/index.tsx */

import { Link, createFileRoute, getRouteApi } from '@tanstack/react-router'
import { getTimelineItems } from '~/features/content/server'
import type { TimelineItem } from '~/features/content/server'
import { formatDate } from '~/lib/date'
import { resolveImageUrl } from '~/lib/image'

export const Route = createFileRoute('/')({
	loader: () => getTimelineItems(),
	component: HomePage,
})

const rootRoute = getRouteApi('__root__')

function PostCard({
	item,
	timeZone,
}: {
	item: TimelineItem & { type: 'post' }
	timeZone?: string
}) {
	return (
		<Link to="/post/$slug" params={{ slug: item.slug }} className="group block no-underline">
			<article className="border-border-subtle bg-surface hover:border-border-default rounded-lg border p-5 transition-colors">
				<h2 className="text-content-heading group-hover:text-primary text-lg font-semibold">
					{item.title}
				</h2>
				{item.summary && (
					<p className="text-content-secondary mt-1.5 line-clamp-2 text-sm">{item.summary}</p>
				)}
				<time
					className="text-content-tertiary mt-3 block text-xs"
					dateTime={item.createdAt}
					suppressHydrationWarning
				>
					{formatDate(item.createdAt, { timeZone })}
				</time>
			</article>
		</Link>
	)
}

function NoteCard({
	item,
	timeZone,
}: {
	item: TimelineItem & { type: 'note' }
	timeZone?: string
}) {
	const images: string[] = item.images ? JSON.parse(item.images) : []

	return (
		<article className="border-border-subtle bg-surface rounded-lg border p-5">
			<p className="text-content-primary text-sm whitespace-pre-wrap">{item.text}</p>
			{images.length > 0 && (
				<div className="mt-3 flex flex-wrap gap-2">
					{images.map((src) => (
						<img
							key={src}
							src={resolveImageUrl(src)}
							alt=""
							className="h-32 rounded-md object-cover"
						/>
					))}
				</div>
			)}
			<time
				className="text-content-tertiary mt-3 block text-xs"
				dateTime={item.createdAt}
				suppressHydrationWarning
			>
				{formatDate(item.createdAt, { timeZone })}
			</time>
		</article>
	)
}

function HomePage() {
	const items = Route.useLoaderData()
	const { timezone } = rootRoute.useRouteContext()

	return (
		<section>
			{items.length === 0 ? (
				<p className="text-content-secondary py-20 text-center text-sm">Nothing here yet.</p>
			) : (
				<div className="flex flex-col gap-4">
					{items.map((item) => {
						switch (item.type) {
							case 'post': {
								return <PostCard key={item.cid} item={item} timeZone={timezone} />
							}
							case 'note': {
								return <NoteCard key={item.cid} item={item} timeZone={timezone} />
							}
						}
					})}
				</div>
			)}
		</section>
	)
}
