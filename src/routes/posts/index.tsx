/* src/routes/posts/index.tsx */

import { createFileRoute, Link } from '@tanstack/react-router'
import { Navbar } from '~/components/navbar'
import { createServerFn } from '@tanstack/react-start'
import { getCache } from '~/server/platform'
import { readPostIndex } from '~/lib/storage/kv'
import { formatDateShort } from '~/lib/utils/date'
import { SiteFooter } from '~/components/site-footer'
import { getSiteFooterData } from '~/server/site-footer-data'

const getPosts = createServerFn().handler(async () => {
  const all = await readPostIndex(getCache())
  const footer = await getSiteFooterData()
  return { posts: all.filter((p) => p.published), footer }
})

export const Route = createFileRoute('/posts/')({
  loader: () => getPosts(),
  component: PostsPage,
})

function PostsPage() {
  const { posts, footer } = Route.useLoaderData()

  if (posts.length === 0) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-dvh flex-col">
          <main className="mx-auto min-h-svh w-full max-w-180 px-5 pt-16">
            <p className="text-secondary">No posts yet.</p>
          </main>
          <SiteFooter data={footer} />
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="flex min-h-dvh flex-col">
        <main className="mx-auto flex min-h-svh w-full max-w-180 flex-col justify-center px-5">
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
                        {formatDateShort(post.createdAt)}
                      </time>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </main>
        <SiteFooter data={footer} />
      </div>
    </>
  )
}
