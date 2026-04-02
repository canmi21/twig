/* src/routes/posts/$category/$slug/index.tsx */

/* eslint-disable better-tailwindcss/no-unknown-classes */

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
import { Signature } from '~/components/post/signature'
import postPageCss from '~/styles/post-page.css?url'

const getPost = createServerFn()
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data }) => {
    return readPostKv(getCache(), data.slug)
  })

export const Route = createFileRoute('/posts/$category/$slug/')({
  loader: ({ params }) => getPost({ data: { slug: params.slug } }),
  head: ({ loaderData, match }) => {
    if (!loaderData)
      return { meta: [], links: [{ rel: 'stylesheet', href: postPageCss }] }
    const { title, description } = loaderData.frontmatter
    const { publicUrl, canonicalUrl } = match.context
    const ogImage = `${publicUrl}/api/og/${loaderData.frontmatter.cid}`
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:image', content: ogImage },
        { property: 'og:url', content: canonicalUrl },
        { property: 'og:type', content: 'article' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: ogImage },
      ],
      links: [{ rel: 'stylesheet', href: postPageCss }],
    }
  },
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
      <ThemeToggle className="post-page-theme-toggle absolute top-5 right-5 z-50 cursor-pointer rounded-full p-2 xl:fixed" />
      <PostBackLink />
      <Toc entries={post.toc} />
      <PostActions />
      <article className="post-page mx-auto max-w-180 px-5 pt-28 pb-24">
        <ArticleHeader
          title={frontmatter.title}
          createdAt={frontmatter.created_at}
          html={post.html}
        >
          <PostShareActions />
        </ArticleHeader>
        <div className="article post-page__body">
          <PostRenderer html={post.html} components={post.components} />
        </div>
        {frontmatter.tags && frontmatter.tags.length > 0 && (
          <>
            <div className="post-page__footer-wrap">
              <div className="post-page__footer-main flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-secondary">
                <a
                  href="https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode"
                  target="_blank"
                  rel="noreferrer"
                  className="post-page__license"
                >
                  CC BY-NC-SA 4.0
                </a>
                {frontmatter.updated_at && (
                  <span className="post-page__updated">
                    Updated on{' '}
                    {formatShortDate(
                      frontmatter.updated_at,
                      shouldShowUpdatedYear,
                    )}
                  </span>
                )}
              </div>
              <div className="post-page__footer text-[12px] text-secondary">
                <div className="post-page__footer-line" aria-hidden="true" />
                <div className="post-page__signature-wrap">
                  <Signature className="post-page__signature h-13.5 select-none" />
                </div>
              </div>
              <div className="post-page__tags flex flex-wrap gap-x-3 gap-y-1 pt-3 text-[12px] text-secondary">
                {frontmatter.tags.map((tag) => (
                  <span key={tag} className="post-page__tag capitalize">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
        {frontmatter.cid && <CommentSection postCid={frontmatter.cid} />}
      </article>
    </>
  )
}
