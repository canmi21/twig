/* src/routes/posts/index.tsx */

import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getEnv } from '~/server/env'
import { readPostIndex } from '~/lib/storage/kv'

const getPosts = createServerFn().handler(async () => {
  const { taki_kv } = getEnv()
  return readPostIndex(taki_kv)
})

export const Route = createFileRoute('/posts/')({
  loader: () => getPosts(),
  component: PostList,
})

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function PostList() {
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
      <ul>
        {posts.map((post, i) => (
          <li
            key={post.slug}
            className={i > 0 ? 'mt-6 border-t border-border pt-6' : ''}
          >
            <Link
              to="/posts/$category/$slug"
              params={{
                category: post.category ?? 'uncategorized',
                slug: post.slug,
              }}
              className="
                text-[15px] font-medium text-primary
                hover:underline
              "
            >
              {post.title}
            </Link>
            <div className="mt-1 flex items-center gap-3 text-[13px] text-secondary">
              {post.category && <span>{post.category}</span>}
              {post.createdAt && (
                <>
                  {post.category && <span className="text-secondary">·</span>}
                  <time dateTime={post.createdAt}>
                    {formatDate(post.createdAt)}
                  </time>
                </>
              )}
            </div>
            {post.description && (
              <p className="mt-1.5 text-[14px] leading-relaxed text-primary">
                {post.description}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
