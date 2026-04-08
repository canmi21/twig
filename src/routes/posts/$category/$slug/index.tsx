/* src/routes/posts/$category/$slug/index.tsx */

/* eslint-disable better-tailwindcss/no-unknown-classes */

import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getCache, getDb } from '~/server/platform'
import { readPostKv } from '~/lib/storage/kv'
import { resolvePostSlugByCid } from '~/lib/database/posts'
import { PostRenderer } from '~/components/post/renderer'
import { PostBackLink } from '~/components/post/back-link'
import { PostShareActions } from '~/components/post/share-actions'
import { Toc } from '~/components/post/toc'
import { PostActions } from '~/components/post/actions'
import { ArticleHeader } from '~/components/post/article-header'
import { CommentSection } from '~/components/post/comment-section'
import { ThemeToggle } from '~/components/theme-toggle'
import { Signature } from '~/components/post/signature'
import postPageCss from '~/styles/post/page.css?url'

const resolveSlug = createServerFn()
  .inputValidator((input: { cid: string }) => input)
  .handler(async ({ data }) => {
    return resolvePostSlugByCid(getDb(), data.cid) ?? null
  })

const getPost = createServerFn()
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data }) => {
    return readPostKv(getCache(), data.slug)
  })

export const Route = createFileRoute('/posts/$category/$slug/')({
  validateSearch: (search: Record<string, unknown>): { cid?: string } => ({
    cid: typeof search.cid === 'string' ? search.cid : undefined,
  }),
  beforeLoad: async ({ params, search }) => {
    if (!search.cid) return

    const post = await resolveSlug({ data: { cid: search.cid } })
    const target =
      post && post.category
        ? `/posts/${post.category}/${post.slug}`
        : post
          ? `/posts/_/${post.slug}`
          : `/posts/${params.category}/${params.slug}`

    throw redirect({ to: target, statusCode: 302 })
  },
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
      <ThemeToggle className="absolute top-5 right-5 z-50 cursor-pointer rounded-full p-2 text-primary opacity-(--opacity-subtle) transition-[color,opacity] duration-140 hover:opacity-100 xl:fixed" />
      <PostBackLink />
      <Toc entries={post.toc} />
      <PostActions />
      <article className="post mx-auto max-w-190 px-5 pt-27 pb-28 text-primary">
        <ArticleHeader
          title={frontmatter.title}
          createdAt={frontmatter.created_at}
          html={post.html}
        >
          <PostShareActions cid={frontmatter.cid} tweet={frontmatter.tweet} />
        </ArticleHeader>
        <div className="article post__body leading-relaxed font-[450] tracking-[0.002em] text-primary">
          <PostRenderer html={post.html} components={post.components} />
        </div>
        {frontmatter.tags && frontmatter.tags.length > 0 && (
          <>
            <div className="mt-14">
              <div className="flex flex-wrap items-center gap-x-[0.52rem] gap-y-1 text-[12px] leading-none text-primary opacity-(--opacity-muted)">
                <a
                  href="https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary opacity-(--opacity-muted) transition-[color,opacity] duration-140 hover:opacity-100"
                >
                  CC BY-NC-SA 4.0
                </a>
                {frontmatter.updated_at && (
                  <span className="text-primary opacity-(--opacity-muted)">
                    Updated on{' '}
                    {formatShortDate(
                      frontmatter.updated_at,
                      shouldShowUpdatedYear,
                    )}
                  </span>
                )}
              </div>
              <div
                className="post__footer text-[12px] text-secondary"
                aria-hidden="true"
              >
                <div className="min-w-0 flex-1 border-b border-dashed border-border" />
                <div className="post__signature">
                  <Signature className="h-13.5 text-primary opacity-(--opacity-muted) select-none" />
                </div>
              </div>
              <div className="flex flex-wrap gap-x-[0.8rem] gap-y-[0.45rem] pt-3 text-[12px] text-secondary">
                {frontmatter.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-primary capitalize opacity-(--opacity-muted) transition-[color,opacity] duration-140 hover:opacity-100"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
        {frontmatter.cid && (
          <CommentSection postCid={frontmatter.cid} tweet={frontmatter.tweet} />
        )}
      </article>
    </>
  )
}
