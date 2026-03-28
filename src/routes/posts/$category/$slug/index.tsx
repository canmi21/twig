/* src/routes/posts/$category/$slug/index.tsx */

import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getCache } from '~/server/platform'
import { readPostKv } from '~/lib/storage/kv'
import { PostRenderer } from '~/components/post/renderer'
import { PostBackLink } from '~/components/post/back-link'
import { PostShareActions } from '~/components/post/share-actions'
import { Toc } from '~/components/post/toc'
import { PostActions } from '~/components/post/actions'
import { ArticleHeader } from '~/components/post/article-header'
import { CommentSection } from '~/components/post/comment-section'
import { ThemeToggle } from '~/components/theme-toggle'
import { SiteNav } from '~/components/site-nav'

const getPost = createServerFn()
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data }) => {
    return readPostKv(getCache(), data.slug)
  })

export const Route = createFileRoute('/posts/$category/$slug/')({
  loader: ({ params }) => getPost({ data: { slug: params.slug } }),
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: loaderData.frontmatter.title }] : [],
  }),
  component: PostPage,
})

function formatShortDate(iso: string, includeYear: boolean): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' as const } : {}),
  })
}

function PostPage() {
  const post = Route.useLoaderData()

  if (!post) {
    return (
      <div className="mx-auto max-w-180 px-5 pt-24">
        <p className="text-secondary">Post not found.</p>
      </div>
    )
  }

  const { frontmatter } = post
  const shouldShowUpdatedYear =
    !frontmatter.created_at ||
    new Date(frontmatter.updated_at ?? '').getFullYear() !==
      new Date(frontmatter.created_at).getFullYear()

  return (
    <>
      <SiteNav />
      <ThemeToggle />
      <PostBackLink />
      <Toc entries={post.toc} />
      <PostActions />
      <article className="mx-auto max-w-180 px-5 pt-16 pb-24">
        <ArticleHeader
          title={frontmatter.title}
          createdAt={frontmatter.created_at}
          html={post.html}
        >
          <PostShareActions />
        </ArticleHeader>
        {/* eslint-disable-next-line better-tailwindcss/no-unknown-classes */}
        <div className="article">
          <PostRenderer html={post.html} components={post.components} />
        </div>
        {frontmatter.tags && frontmatter.tags.length > 0 && (
          <>
            <div className="mt-14 border-t border-dashed border-border pt-6">
              <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[13px] text-secondary">
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {frontmatter.tags.map((tag) => (
                    <span key={tag} className="capitalize">
                      #{tag}
                    </span>
                  ))}
                </div>
                {frontmatter.updated_at && (
                  <div className="text-[12px] text-secondary">
                    Updated on{' '}
                    {formatShortDate(
                      frontmatter.updated_at,
                      shouldShowUpdatedYear,
                    )}
                  </div>
                )}
              </footer>
            </div>
          </>
        )}
        {frontmatter.cid && <CommentSection postCid={frontmatter.cid} />}
      </article>
    </>
  )
}
