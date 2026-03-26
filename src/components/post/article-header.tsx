/* src/components/post/article-header.tsx */

import * as Tooltip from '@radix-ui/react-tooltip'
import { CreativeCommons, Type } from 'lucide-react'

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

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

export function countContentUnits(html: string): number {
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

export function formatCount(count: number): string {
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
  children,
}: {
  title: string
  createdAt?: string
  html?: string
  children?: React.ReactNode
}) {
  const contentCount = html ? formatCount(countContentUnits(html)) : undefined
  return (
    <header className="mb-10 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="text-[17px] font-medium text-primary">{title}</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-secondary">
          {createdAt && (
            <time dateTime={createdAt}>{formatDate(createdAt)}</time>
          )}
          <Tooltip.Provider delayDuration={480} skipDelayDuration={0}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <span
                  aria-label="CC BY-NC-SA 4.0 license"
                  className="inline-flex cursor-default items-center text-secondary transition-colors hover:text-primary"
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
                  className="z-10 rounded-full border border-border bg-surface px-2.5 py-1.5 text-[11px] leading-none shadow-sm"
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
          {contentCount && (
            <span className="inline-flex items-center gap-1">
              <Type className="size-[0.8rem]" strokeWidth={1.8} />
              <span>{contentCount}</span>
            </span>
          )}
        </div>
      </div>
      {children}
    </header>
  )
}
