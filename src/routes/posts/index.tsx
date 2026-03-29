/* src/routes/posts/index.tsx */

import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getCache } from '~/server/platform'
import { readPostIndex } from '~/lib/storage/kv'
import { SiteNav } from '~/components/site-nav'
import { SiteFooter } from '~/components/site-footer'

const getPosts = createServerFn().handler(async () => {
  return readPostIndex(getCache())
})

export const Route = createFileRoute('/posts/')({
  loader: () => getPosts(),
  component: PostsPage,
})

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function PostsPage() {
  const posts = Route.useLoaderData()

  if (posts.length === 0) {
    return (
      <div className="mx-auto max-w-180 px-5 pt-24">
        <p className="text-secondary">No posts yet.</p>
      </div>
    )
  }

  return (
    <>
      <SiteNav />
      <main className="min-h-screen bg-surface">
        <div className="mx-auto max-w-180 px-5 pt-12 pb-24">
          <ul className="space-y-6">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link
                  to="/posts/$category/$slug"
                  params={{
                    category: post.category ?? 'uncategorized',
                    slug: post.slug,
                  }}
                  className="group block text-foreground"
                >
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-medium decoration-boundary underline-offset-[3px] group-hover:underline">
                        {post.title}
                      </div>
                      {post.description && (
                        <p className="mt-1 truncate text-[13px] text-secondary">
                          {post.description}
                        </p>
                      )}
                    </div>
                    <div className="hidden min-w-8 flex-1 border-t border-dashed border-boundary sm:block" />
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
      </main>
      <SiteFooter />
    </>
  )
}
