/* src/routes/posts/index.tsx */

import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getEnv } from '~/lib/content/env'
import { readPostIndex } from '~/lib/content/kv'

const getPosts = createServerFn().handler(async () => {
  const { taki_kv } = getEnv()
  return readPostIndex(taki_kv)
})

export const Route = createFileRoute('/posts/')({
  loader: () => getPosts(),
  component: PostList,
})

function PostList() {
  const posts = Route.useLoaderData()

  if (posts.length === 0) {
    return <p>No posts yet.</p>
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Posts</h1>
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
                text-lg font-medium text-blue-600
                hover:underline
                dark:text-blue-400
              "
            >
              {post.title}
            </Link>
            {post.description && (
              <p
                className="
                  mt-1 text-gray-500
                  dark:text-gray-400
                "
              >
                {post.description}
              </p>
            )}
            {post.category && (
              <span
                className="
                  mt-1 inline-block text-xs text-gray-400
                  dark:text-gray-500
                "
              >
                {post.category}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
