/* src/routes/posts/$category/$slug/index.tsx */

import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getEnv } from '~/lib/content/env'
import { readPostKv } from '~/lib/content/kv'
import { PostRenderer } from '~/components/post-renderer'

const getPost = createServerFn()
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data }) => {
    const { taki_kv } = getEnv()
    return readPostKv(taki_kv, data.slug)
  })

export const Route = createFileRoute('/posts/$category/$slug/')({
  loader: ({ params }) => getPost({ data: { slug: params.slug } }),
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [{ title: `${loaderData.frontmatter.title} - Taki` }]
      : [],
  }),
  component: PostPage,
})

function PostPage() {
  const post = Route.useLoaderData()

  if (!post) {
    return <p>Post not found.</p>
  }

  return (
    <article>
      <h1>{post.frontmatter.title}</h1>
      {post.frontmatter.description && <p>{post.frontmatter.description}</p>}
      <PostRenderer html={post.html} components={post.components} />
    </article>
  )
}
