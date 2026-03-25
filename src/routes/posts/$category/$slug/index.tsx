/* src/routes/posts/$category/$slug/index.tsx */

import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as Tooltip from '@radix-ui/react-tooltip'
import { CreativeCommons, Type } from 'lucide-react'
import { getCache } from '~/server/platform'
import { readPostKv } from '~/lib/storage/kv'
import { PostRenderer } from '~/components/post/renderer'
import { PostBackLink } from '~/components/post/back-link'
import { PostShareActions } from '~/components/post/share-actions'
import { Toc } from '~/components/post/toc'
import { PostActions } from '~/components/post/actions'

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

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatShortDate(iso: string, includeYear: boolean): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' as const } : {}),
  })
}

function stripHtml(html: string): string {
  return html
    .replaceAll(/<!--[\s\S]*?-->/g, ' ')
    .replaceAll(/<[^>]+>/g, ' ')
    .replaceAll(/&nbsp;/g, ' ')
    .replaceAll(/&amp;/g, '&')
    .replaceAll(/&lt;/g, '<')
    .replaceAll(/&gt;/g, '>')
    .replaceAll(/\s+/g, ' ')
    .trim()
}

function countContentUnits(html: string): number {
  const text = stripHtml(html)
  if (!text) return 0

  const cjkCount = Array.from(
    text.matchAll(
      /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu,
    ),
  ).length
  const latinWordCount =
    text
      .replaceAll(
        /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu,
        ' ',
      )
      .match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)?.length ?? 0

  return cjkCount + latinWordCount
}

function formatCount(count: number): string {
  if (count < 1000) return String(count)

  const compact = count / 1000
  if (Number.isInteger(compact)) return `${compact}K`
  if (count < 10000) return `${compact.toFixed(2).replace(/\.?0+$/, '')}K`
  return `${compact.toFixed(1).replace(/\.0$/, '')}K`
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
  const contentCount = formatCount(countContentUnits(post.html))
  const shouldShowUpdatedYear =
    !frontmatter.created_at ||
    new Date(frontmatter.updated_at ?? '').getFullYear() !==
      new Date(frontmatter.created_at).getFullYear()

  return (
    <>
      <PostBackLink />
      <Toc entries={post.toc} />
      <PostActions />
      <article className="mx-auto max-w-180 px-5 pt-28 pb-24">
        <header className="mb-10 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[17px] font-medium text-primary">
              {frontmatter.title}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-secondary">
              {frontmatter.created_at && (
                <time dateTime={frontmatter.created_at}>
                  {formatDate(frontmatter.created_at)}
                </time>
              )}
              <Tooltip.Provider delayDuration={480} skipDelayDuration={0}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <span
                      aria-label="CC BY-NC-SA 4.0 license"
                      className="
                        inline-flex cursor-default items-center text-secondary transition-colors
                        hover:text-primary
                      "
                    >
                      <CreativeCommons
                        className="size-[0.8rem]"
                        strokeWidth={1.8}
                      />
                    </span>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      side="top"
                      sideOffset={4}
                      className="
                        z-10 rounded-full border border-border bg-surface
                        px-2.5 py-1.5 text-[11px] leading-none shadow-sm
                      "
                    >
                      <a
                        href="https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode"
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        CC BY-NC-SA 4.0
                      </a>
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
              <span className="inline-flex items-center gap-1">
                <Type className="size-[0.8rem]" strokeWidth={1.8} />
                <span>{contentCount}</span>
              </span>
            </div>
          </div>
          <PostShareActions />
        </header>
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
      </article>
    </>
  )
}
