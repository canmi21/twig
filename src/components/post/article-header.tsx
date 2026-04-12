/* src/components/post/article-header.tsx */

import { Eye, Type } from 'lucide-react'
import { formatDate } from '~/lib/utils/date'

function stripHtml(html: string): string {
  return html
    .replaceAll(/<!--[\s\S]*?-->/g, ' ')
    .replaceAll(/<[^>]+>/g, ' ')
    .replaceAll(/&nbsp;/g, ' ')
    .replaceAll(/&lt;/g, '<')
    .replaceAll(/&gt;/g, '>')
    .replaceAll(/&amp;/g, '&')
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
      .match(/[A-Za-z0-9]+(?:[''-][A-Za-z0-9]+)*/g)?.length ?? 0

  return cjkCount + latinWordCount
}

function formatCount(count: number): string {
  if (count < 1000) return String(count)

  const compact = count / 1000
  if (Number.isInteger(compact)) return `${compact}K`
  if (count < 10000) return `${compact.toFixed(2).replace(/\.?0+$/, '')}K`
  return `${compact.toFixed(1).replace(/\.0$/, '')}K`
}

export function ArticleHeader({
  title,
  createdAt,
  html,
  text,
  readers,
  children,
}: {
  title: string
  createdAt?: string
  /** Compiled HTML — used to compute content count on post page */
  html?: string
  /** Raw text (e.g. markdown) — used to compute content count in editor */
  text?: string
  /** Live reader count from presence tracking */
  readers?: number
  children?: React.ReactNode
}) {
  const source = html ?? text
  const contentCount = source
    ? formatCount(countContentUnits(source))
    : undefined
  return (
    <header className="mb-11 flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-lg/relaxed font-[560] -tracking-[0.015em] text-primary">
          {title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-[0.52rem] gap-y-1 font-['Roboto','Source_Sans_3','CJK_Sans',system-ui,-apple-system,sans-serif] text-[0.8125rem] leading-none text-primary opacity-(--opacity-muted)">
          {createdAt && (
            <time
              className="inline-flex min-h-[0.8rem] items-center"
              dateTime={createdAt}
            >
              {formatDate(createdAt)}
            </time>
          )}
          {contentCount && (
            <span className="inline-flex min-h-[0.8rem] items-center gap-[0.18rem] text-primary [&>svg]:block [&>svg]:flex-none">
              <Type className="size-[0.8rem]" strokeWidth={1.8} />
              <span>{contentCount}</span>
            </span>
          )}
          {readers != null && readers > 0 && (
            <span className="inline-flex min-h-[0.8rem] items-center gap-[0.18rem] text-primary [&>svg]:block [&>svg]:flex-none">
              <Eye className="size-[0.8rem]" strokeWidth={1.8} />
              <span>{readers}</span>
            </span>
          )}
        </div>
      </div>
      {children}
    </header>
  )
}
