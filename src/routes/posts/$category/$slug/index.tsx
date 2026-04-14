/* src/routes/posts/$category/$slug/index.tsx */

/* eslint-disable better-tailwindcss/no-unknown-classes */

import { useLayoutEffect, useRef, useState } from 'react'
import {
  createFileRoute,
  redirect,
  useRouteContext,
} from '@tanstack/react-router'
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
import { getPresenceCount } from '~/server/presence-count'
import { usePresence } from '~/lib/presence'
import { SiteFooter } from '~/components/site-footer'
import { getSiteFooterData } from '~/server/site-footer-data'
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

const getFooterData = createServerFn().handler(() => getSiteFooterData())

const DESKTOP_MEDIA_QUERY = '(min-width: 1280px)'
const ARTICLE_TITLE_TOP_PX = 108
const BACK_TO_TOC_MIN_GAP_PX = 48

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
  loader: async ({ params }) => {
    const [post, footer] = await Promise.all([
      getPost({ data: { slug: params.slug } }),
      getFooterData(),
    ])
    const cid = post?.frontmatter.cid
    const presence = cid
      ? await getPresenceCount({ data: { cid } })
      : { global: 0, article: 0, reads: 0 }
    return { post, presence, footer }
  },
  head: ({ loaderData, match }) => {
    if (!loaderData?.post)
      return { meta: [], links: [{ rel: 'stylesheet', href: postPageCss }] }
    const { title, description } = loaderData.post.frontmatter
    const { publicUrl, canonicalUrl } = match.context
    const ogImage = `${publicUrl}/api/og/${loaderData.post.frontmatter.cid}`
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

function formatShortDate(
  iso: string,
  includeYear: boolean,
  timeZone: string,
): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' as const } : {}),
    timeZone,
  })
}

// Collapsed TOC height: each entry = 4px bar + 6px gap (except last).
function estimateCollapsedTocHeight(entryCount: number) {
  return Math.max(0, entryCount * 10 - 6)
}

const RAIL_MIN_TOP = ARTICLE_TITLE_TOP_PX + BACK_TO_TOC_MIN_GAP_PX

// CSS expression that approximates the centered rail position.
// Used for SSR so the first paint is already near-correct; JS refines
// to the exact pixel value in useLayoutEffect (typically <5px diff).
function railTopFallbackCss(tocEntryCount: number) {
  const halfH = Math.round(estimateCollapsedTocHeight(tocEntryCount) / 2)
  return `max(${RAIL_MIN_TOP}px, calc(50vh - ${halfH}px))`
}

function usePostNavigationRailTop(tocEntryCount: number) {
  const tocRef = useRef<HTMLDivElement>(null)
  const [railTop, setRailTop] = useState<number | null>(null)
  const collapsedHeightRef = useRef(0)
  const fallbackCss = railTopFallbackCss(tocEntryCount)

  useLayoutEffect(() => {
    const el = tocRef.current
    if (!el) return

    const media = window.matchMedia(DESKTOP_MEDIA_QUERY)

    function centeredRailTop(h: number) {
      const centered = h > 0 ? (window.innerHeight - h) / 2 : RAIL_MIN_TOP
      return Math.max(RAIL_MIN_TOP, centered)
    }

    // Capture collapsed height once on mount — the collapsed TOC height
    // only depends on entry count (fixed bar heights + gaps), not hover state.
    collapsedHeightRef.current = el.offsetHeight
    setRailTop(centeredRailTop(collapsedHeightRef.current))

    // Lock the parent's layout height to the collapsed size so TOC
    // expansion doesn't shift the sticky unstick boundary — prevents
    // oscillation near the article bottom.
    if (el.parentElement) {
      el.parentElement.style.height = `${collapsedHeightRef.current}px`
    }

    // When the TOC resizes (hover expand/collapse), shift it via translateY
    // so it grows from its visual center. The rail position stays fixed,
    // keeping the Back link stable.
    const observer = new ResizeObserver((entries) => {
      if (!media.matches) return
      const h = entries[0]?.contentRect.height ?? 0
      const delta = h - collapsedHeightRef.current
      el.style.transform = delta
        ? `translateY(${(-delta / 2).toFixed(1)}px)`
        : ''
    })
    observer.observe(el)

    function onResize() {
      if (!media.matches) return
      setRailTop(centeredRailTop(collapsedHeightRef.current))
    }

    window.addEventListener('resize', onResize)
    media.addEventListener('change', onResize)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', onResize)
      media.removeEventListener('change', onResize)
    }
  }, [])

  return { tocRef, railTop, fallbackCss }
}

function PostPage() {
  const { post, presence, footer } = Route.useLoaderData()
  const { siteTimezone } = useRouteContext({ from: '__root__' })

  if (!post) {
    return (
      <div className="flex min-h-dvh flex-col">
        <main className="mx-auto min-h-svh w-full max-w-180 px-5 pt-24">
          <p className="text-secondary">Post not found.</p>
        </main>
        <SiteFooter data={footer} />
      </div>
    )
  }

  const { frontmatter } = post
  const live = usePresence({
    cid: frontmatter.cid,
    initialGlobal: presence.global,
    initialArticle: presence.article,
  })
  const shouldShowUpdatedYear =
    !frontmatter.created_at ||
    new Date(frontmatter.updated_at ?? '').getFullYear() !==
      new Date(frontmatter.created_at).getFullYear()
  const { tocRef, railTop, fallbackCss } = usePostNavigationRailTop(
    post.toc.length,
  )

  // SSR: use CSS expression (viewport-relative, no JS needed).
  // Client: use exact pixel value from useLayoutEffect.
  const asideTop = railTop != null ? railTop : fallbackCss
  const backLinkTop =
    railTop != null
      ? ARTICLE_TITLE_TOP_PX - railTop
      : `calc(${ARTICLE_TITLE_TOP_PX}px - ${fallbackCss})`

  return (
    <>
      <ThemeToggle className="absolute top-5 right-5 z-50 cursor-pointer rounded-full p-2 text-primary opacity-(--opacity-subtle) transition-[color,opacity] duration-140 hover:opacity-100 xl:fixed" />
      <PostBackLink className="absolute top-5 left-5 z-50 inline-flex items-center justify-center rounded-full p-2 text-primary opacity-(--opacity-subtle) transition-[color,opacity] duration-140 hover:opacity-100 xl:hidden" />
      <div className="flex min-h-dvh flex-col">
        <main className="min-h-svh">
          <div className="grid w-full grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,47.5rem)_minmax(0,1fr)] xl:pt-27">
            <aside
              aria-label="Post navigation"
              className="hidden max-h-[calc(100svh-12rem)] pl-[max(1.5rem,calc((100vw-45rem)/4-5.5rem))] xl:sticky xl:col-start-1 xl:row-start-1 xl:block xl:self-start xl:justify-self-start"
              style={{ top: asideTop }}
            >
              <div className="relative min-w-24">
                <PostBackLink
                  className="absolute left-0 inline-flex items-center justify-start gap-1.5 rounded-none p-0 text-primary opacity-(--opacity-subtle) transition-[color,opacity] duration-140 hover:opacity-100"
                  style={{ top: backLinkTop }}
                />
                <div ref={tocRef}>
                  <Toc
                    entries={post.toc}
                    className="block max-h-[calc(100svh-18rem)] overflow-y-auto"
                  />
                </div>
              </div>
            </aside>
            <article className="post post--bounded-body mx-auto w-full max-w-190 px-5 pt-27 text-primary xl:col-start-2 xl:row-start-1 xl:pt-0">
              <ArticleHeader
                title={frontmatter.title}
                createdAt={frontmatter.created_at}
                timeZone={siteTimezone}
                html={post.html}
                readers={live.article}
                reads={presence.reads}
              >
                <PostShareActions
                  cid={frontmatter.cid}
                  tweet={frontmatter.tweet}
                />
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
                            siteTimezone,
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
            </article>
            <PostActions className="mr-[max(1.5rem,calc((100vw-45rem)/4-5.5rem))] hidden max-h-[calc(100svh-12rem)] w-10 -translate-y-1/2 flex-col items-center gap-1 overflow-y-auto xl:sticky xl:top-1/2 xl:col-start-3 xl:row-start-1 xl:flex xl:self-start xl:justify-self-end" />
          </div>
          {frontmatter.cid && (
            <div className="mx-auto max-w-190 px-5 pb-28 text-primary">
              <CommentSection
                postCid={frontmatter.cid}
                tweet={frontmatter.tweet}
              />
            </div>
          )}
          {!frontmatter.cid && <div className="pb-28" aria-hidden="true" />}
        </main>
        <SiteFooter data={footer} globalPresenceCount={live.global} />
      </div>
    </>
  )
}
