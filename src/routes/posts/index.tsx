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
    <div>
      <h1>Posts</h1>
      <ul>
        {posts.map((post) => (
          <li key={post.slug}>
            <Link
              to="/posts/$category/$slug"
              params={{
                category: post.category ?? 'uncategorized',
                slug: post.slug,
              }}
            >
              {post.title}
            </Link>
            {post.description && <p>{post.description}</p>}
            {post.category && <span> [{post.category}]</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
