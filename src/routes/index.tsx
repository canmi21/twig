/* src/routes/index.tsx */

import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getEnv } from '~/server/env'
import { readPostIndex } from '~/lib/storage/kv'

const getPosts = createServerFn().handler(async () => {
  const { taki_kv } = getEnv()
  return readPostIndex(taki_kv)
})

export const Route = createFileRoute('/')({
  loader: () => getPosts(),
  component: HomePage,
})

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function HomePage() {
  const posts = Route.useLoaderData()

  if (posts.length === 0) {
    return (
      <div className="mx-auto max-w-[720px] px-5 pt-24">
        <p className="text-secondary">No posts yet.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[720px] px-5 py-24">
      <ul className="space-y-6">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link
              to="/posts/$category/$slug"
              params={{
                category: post.category ?? 'uncategorized',
                slug: post.slug,
              }}
              className="
                block
                text-primary
                hover:text-primary
              "
            >
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium">
                    {post.title}
                  </div>
                  {post.description && (
                    <p className="mt-1 truncate text-[13px] text-secondary">
                      {post.description}
                    </p>
                  )}
                </div>
                <div className="hidden min-w-8 flex-1 border-t border-dashed border-border sm:block" />
                {post.createdAt && (
                  <time
                    dateTime={post.createdAt}
                    className="shrink-0 text-[13px] text-secondary"
                  >
                    {formatDate(post.createdAt)}
                  </time>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
