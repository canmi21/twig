/* src/routes/posts/$category/$slug/index.tsx */

import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getEnv } from '~/server/env'
import { readPostKv } from '~/lib/storage/kv'
import { PostRenderer } from '~/components/post/post-renderer'
import { PostBackLink } from '~/components/post/post-back-link'
import { PostShareActions } from '~/components/post/post-share-actions'
import { Toc } from '~/components/post/toc'

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

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function PostPage() {
  const post = Route.useLoaderData()

  if (!post) {
    return (
      <div className="mx-auto max-w-[720px] px-5 pt-24">
        <p className="text-secondary">Post not found.</p>
      </div>
    )
  }

  const { frontmatter } = post

  return (
    <>
      <PostBackLink />
      <Toc entries={post.toc} />
      <article className="mx-auto max-w-[720px] px-5 pt-28 pb-24">
        <header className="mb-10 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[17px] font-medium text-primary">
              {frontmatter.title}
            </h1>
            {frontmatter.created_at && (
              <time
                dateTime={frontmatter.created_at}
                className="mt-1.5 block text-[13px] text-secondary"
              >
                {formatDate(frontmatter.created_at)}
              </time>
            )}
          </div>
          <PostShareActions />
        </header>
        {/* eslint-disable-next-line better-tailwindcss/no-unknown-classes */}
        <div className="article">
          <PostRenderer html={post.html} components={post.components} />
        </div>
        {frontmatter.tags && frontmatter.tags.length > 0 && (
          <footer className="mt-16 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-secondary">
            {frontmatter.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </footer>
        )}
      </article>
    </>
  )
}
