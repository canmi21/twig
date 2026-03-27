/* src/routes/@/editor/$cid/index.tsx */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type PointerEvent,
  type CSSProperties,
} from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { getDb, getCache } from '~/server/platform'
import { getPostByCid, upsertPost, getAllPosts } from '~/lib/database/posts'
import { writePostKv, deletePostKv, writePostIndex } from '~/lib/storage/kv'
import { compile } from '~/lib/compiler/index'
import { computeContentHash } from '~/lib/utils/hash'
import { postSchema } from '~/lib/content/post-schema'
import { verifyCfAccess } from '~/server/auth'
import type { PostIndexEntry } from '~/lib/storage/kv'
import { ArrowLeft, Settings, Eye, CodeXml } from 'lucide-react'
import { motion } from 'motion/react'
import { ArticleHeader } from '~/components/post/article-header'
import { PostShareActions } from '~/components/post/share-actions'
import { ThemeToggle } from '~/components/theme-toggle'
import type { PreviewResult } from '~/lib/compiler/compile-preview'
import type { HtmlSourceHighlightResult } from '~/lib/shiki/html-source-highlighter'
import type { ThemedToken } from 'shiki/core'

const DEFAULT_SPLIT = 0.5
const MIN_SPLIT = 0.25
const MAX_SPLIT = 0.75

function parseActiveSearch(value: unknown): boolean | undefined {
  if (value === true || value === 'true') return true
  return undefined
}

// --- Server functions ---

const getPost = createServerFn({ method: 'GET' })
  .inputValidator((input: { cid: string }) => input)
  .handler(async ({ data }) => {
    const db = getDb()
    const post = await getPostByCid(db, data.cid)
    if (!post) throw new Error('Post not found')
    return post
  })

interface SavePostData {
  cid: string
  slug: string
  title: string
  description: string
  category: string
  tags: string
  content: string
  published: boolean
}

const savePost = createServerFn({ method: 'POST' })
  .inputValidator((input: SavePostData) => input)
  .handler(async ({ data }) => {
    if (!import.meta.env.DEV) {
      const identity = await verifyCfAccess(getRequest())
      if (!identity) throw new Error('Unauthorized')
    }

    const parsed = postSchema.safeParse({
      slug: data.slug,
      title: data.title,
      description: data.description || undefined,
      category: data.category,
      tags: data.tags
        ? data.tags
            .split(',')
            .map((t: string) => t.trim())
            .filter(Boolean)
        : undefined,
      content: data.content,
      cid: data.cid,
      published: data.published,
    })

    if (!parsed.success) {
      return {
        ok: false as const,
        errors: parsed.error.issues.map(
          (i) => `${i.path.join('.')}: ${i.message}`,
        ),
      }
    }

    const db = getDb()
    const kv = getCache()

    const oldPost = await getPostByCid(db, data.cid)
    const oldSlug = oldPost?.slug

    const contentHash = computeContentHash(data.content)
    const result = await upsertPost(db, {
      slug: parsed.data.slug,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      tags: parsed.data.tags,
      content: parsed.data.content,
      contentHash,
      cid: parsed.data.cid,
      published: parsed.data.published,
    })

    if (oldSlug && oldSlug !== result.slug) {
      await deletePostKv(kv, oldSlug)
    }

    if (parsed.data.published) {
      const compiled = await compile(parsed.data.content)
      await writePostKv(kv, result.slug, {
        frontmatter: {
          title: parsed.data.title,
          description: parsed.data.description,
          category: parsed.data.category,
          tags: parsed.data.tags,
          cid: result.cid,
          published: true,
        },
        html: compiled.html,
        toc: compiled.toc,
        components: compiled.components,
      })
    } else {
      await deletePostKv(kv, result.slug)
    }

    const allPosts = await getAllPosts(db)
    const index: PostIndexEntry[] = allPosts.map((p) => ({
      slug: p.slug,
      title: p.title,
      description: p.description ?? undefined,
      category: p.category ?? undefined,
      tags: p.tags ? JSON.parse(p.tags) : undefined,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      published: p.published === 1,
    }))
    await writePostIndex(kv, index)

    return { ok: true as const }
  })

// --- Route ---

export const Route = createFileRoute('/@/editor/$cid/')({
  validateSearch: (search: Record<string, unknown>) => ({
    preview:
      search.preview === 'rendered' || search.preview === 'source'
        ? search.preview
        : undefined,
    pretty: parseActiveSearch(search.pretty),
    format: parseActiveSearch(search.format),
    highlight: parseActiveSearch(search.highlight),
  }),
  loader: ({ params }) => getPost({ data: { cid: params.cid } }),
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: `Editor - ${loaderData.title}` }] : [],
  }),
  component: EditorPage,
})

// --- Component ---

function EditorPage() {
  const post = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const [slug, setSlug] = useState(post.slug)
  const [title, setTitle] = useState(post.title)
  const [category, setCategory] = useState(post.category ?? '')
  const [tags, setTags] = useState(
    post.tags ? (JSON.parse(post.tags) as string[]).join(', ') : '',
  )
  const [description, setDescription] = useState(post.description ?? '')
  const [content, setContent] = useState(post.content)
  const [published, setPublished] = useState(post.published === 1)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const [previewHtml, setPreviewHtml] = useState('')
  const [compilerReady, setCompilerReady] = useState(false)
  const [compileError, setCompileError] = useState<string | null>(null)

  const compilerRef = useRef<{
    compilePreview: (source: string) => Promise<PreviewResult>
  } | null>(null)

  // Resizable split
  const [splitRatio, setSplitRatio] = useState(DEFAULT_SPLIT)
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const previewMode = search.preview ?? 'rendered'
  const prettyPrint = search.pretty === true
  const formatHtml = search.format === true
  const syntaxHighlight = search.highlight === true

  useEffect(() => {
    if (search.preview) return
    navigate({
      search: (prev) => ({
        ...prev,
        preview: 'rendered',
        pretty: undefined,
        format: true,
        highlight: true,
      }),
      replace: true,
    })
  }, [navigate, search.preview])

  function handleDragStart(e: PointerEvent) {
    e.preventDefault()
    draggingRef.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function handleDragMove(e: PointerEvent) {
    if (!draggingRef.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const ratio = Math.min(
      MAX_SPLIT,
      Math.max(MIN_SPLIT, (e.clientX - rect.left) / rect.width),
    )
    setSplitRatio(ratio)
  }

  function handleDragEnd() {
    draggingRef.current = false
  }

  // Lazy-load compiler
  useEffect(() => {
    import('~/lib/compiler/compile-preview').then((mod) => {
      compilerRef.current = mod
      setCompilerReady(true)
    })
  }, [])

  // Debounced preview
  useEffect(() => {
    const compiler = compilerRef.current
    if (!compilerReady || !compiler) return

    const timer = setTimeout(async () => {
      try {
        const result = await compiler.compilePreview(content)
        setPreviewHtml(result.html)
        setCompileError(null)
      } catch (err) {
        setCompileError(err instanceof Error ? err.message : 'Compile failed')
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [content, compilerReady])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        const ta = e.currentTarget
        const start = ta.selectionStart
        const end = ta.selectionEnd
        const next =
          ta.value.substring(0, start) + '\t' + ta.value.substring(end)
        setContent(next)
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 1
        })
      }
    },
    [],
  )

  async function handleSave() {
    setSaving(true)
    setFeedback(null)

    try {
      const result = await savePost({
        data: {
          cid: post.cid,
          slug,
          title,
          description,
          category,
          tags,
          content,
          published,
        },
      })

      if (!result.ok) {
        setFeedback({ type: 'error', message: result.errors.join('; ') })
      } else {
        setFeedback({ type: 'success', message: 'Saved' })
        setTimeout(() => setFeedback(null), 2000)
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Save failed',
      })
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'rounded-sm border border-border bg-surface px-2 py-1 text-sm text-primary outline-none focus:border-secondary'

  const leftPercent = `${splitRatio * 100}%`
  const rightPercent = `${(1 - splitRatio) * 100}%`

  return (
    <div className="flex h-screen flex-col bg-surface">
      {/* Toolbar */}
      <header className="flex shrink-0 items-center gap-1 border-b border-border px-3 py-1.5">
        <Link
          to="/@/contents"
          className="rounded-sm p-1.5 text-secondary hover:bg-raised hover:text-primary"
        >
          <ArrowLeft className="size-3.5" strokeWidth={1.8} />
        </Link>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setSettingsOpen(!settingsOpen)}
          className={`rounded-sm p-1.5 transition-colors ${settingsOpen ? 'bg-raised text-primary' : 'text-secondary hover:bg-raised hover:text-primary'}`}
        >
          <Settings className="size-3.5" strokeWidth={1.8} />
        </button>
        <div className="mx-1 h-4 w-px bg-border" />
        <label className="flex shrink-0 items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          <span className="text-secondary">Publish</span>
        </label>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="ml-1 shrink-0 rounded-sm bg-primary px-3 py-1 text-xs text-surface disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        {feedback && (
          <span
            className={`shrink-0 text-xs ${
              feedback.type === 'success'
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-500'
            }`}
          >
            {feedback.message}
          </span>
        )}
        <ThemeToggle />
      </header>

      {/* Settings panel */}
      {settingsOpen && (
        <div className="shrink-0 border-b border-border px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className={`${inputClass} min-w-0 flex-1`}
            />
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="slug"
              className={`${inputClass} w-36`}
            />
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="category"
              className={`${inputClass} w-28`}
            />
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tags"
              className={`${inputClass} w-40`}
            />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              className={`${inputClass} min-w-0 flex-1`}
            />
            <span className="shrink-0 text-xs text-tertiary">
              {post.createdAt}
            </span>
          </div>
        </div>
      )}

      {/* Editor + Preview with resizable split */}
      <div ref={containerRef} className="flex min-h-0 flex-1">
        {/* Left: textarea */}
        <div
          className="flex min-w-0 flex-col overflow-hidden"
          style={{ width: leftPercent }}
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-0 flex-1 resize-none border-none bg-surface p-4 font-mono text-[13px]/6 text-primary outline-none"
            spellCheck={false}
          />
        </div>

        {/* Drag handle — fixed hitbox, visual line animates inside */}
        <div className="group relative w-px shrink-0 self-stretch">
          <div
            className="absolute -inset-x-1 inset-y-0 cursor-col-resize"
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
          />
          <motion.div
            className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 bg-border group-hover:bg-secondary group-active:bg-secondary"
            initial={false}
            animate={{ width: 1 }}
            whileHover={{ width: 3 }}
            transition={{ duration: 0.15 }}
          />
        </div>

        {/* Right: preview */}
        <div
          className="relative min-w-0 overflow-hidden"
          style={{ width: rightPercent }}
        >
          <div className="h-full overflow-y-auto">
            {previewMode === 'rendered' ? (
              <div className="mx-auto max-w-180 px-5 pt-14 pb-24">
                <ArticleHeader
                  title={title}
                  createdAt={post.createdAt}
                  html={previewHtml}
                >
                  <PostShareActions />
                </ArticleHeader>
                {!compilerReady ? null : compileError ? (
                  <div className="rounded-sm border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                    {compileError}
                  </div>
                ) : (
                  // Content authored by authenticated admin, compiled by our remark/rehype pipeline
                  <div
                    // eslint-disable-next-line better-tailwindcss/no-unknown-classes
                    className="article"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                )}
              </div>
            ) : (
              <HtmlSourceView
                html={previewHtml}
                prettyPrint={prettyPrint}
                formatHtml={formatHtml}
                syntaxHighlight={syntaxHighlight}
                onPrettyPrintChange={(next) =>
                  navigate({
                    search: (prev) => ({
                      ...prev,
                      pretty: next ? true : undefined,
                    }),
                    replace: true,
                  })
                }
                onFormatHtmlChange={(next) =>
                  navigate({
                    search: (prev) => ({
                      ...prev,
                      format: next ? true : undefined,
                    }),
                    replace: true,
                  })
                }
                onSyntaxHighlightChange={(next) =>
                  navigate({
                    search: (prev) => ({
                      ...prev,
                      highlight: next ? true : undefined,
                    }),
                    replace: true,
                  })
                }
              />
            )}
          </div>
          {/* Floating pill toolbar */}
          <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
            <div className="pointer-events-auto flex items-center rounded-full border border-border bg-surface shadow-sm">
              <button
                type="button"
                onClick={() =>
                  navigate({
                    search: (prev) => ({
                      ...prev,
                      preview:
                        previewMode === 'rendered' ? 'source' : 'rendered',
                    }),
                    replace: true,
                  })
                }
                className="rounded-full p-2 text-secondary transition-colors hover:text-primary"
              >
                {previewMode === 'rendered' ? (
                  <Eye className="size-3.5" strokeWidth={1.8} />
                ) : (
                  <CodeXml className="size-3.5" strokeWidth={1.8} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface HtmlSourceViewProps {
  html: string
  prettyPrint: boolean
  formatHtml: boolean
  syntaxHighlight: boolean
  onPrettyPrintChange: (next: boolean) => void
  onFormatHtmlChange: (next: boolean) => void
  onSyntaxHighlightChange: (next: boolean) => void
}

function HtmlSourceView({
  html,
  prettyPrint,
  formatHtml,
  syntaxHighlight,
  onPrettyPrintChange,
  onFormatHtmlChange,
  onSyntaxHighlightChange,
}: HtmlSourceViewProps) {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : false,
  )
  const [formattedHtml, setFormattedHtml] = useState<string | null>(null)
  const [highlighted, setHighlighted] =
    useState<HtmlSourceHighlightResult | null>(null)
  const sourceHtml = formattedHtml ?? html
  const lines = sourceHtml.split('\n')
  const gutterWidth = String(lines.length).length
  const gutterStyle = { width: `calc(${gutterWidth}ch + 0.5rem)` }

  useEffect(() => {
    const root = document.documentElement
    const syncTheme = () => setIsDark(root.classList.contains('dark'))
    const observer = new MutationObserver(syncTheme)

    syncTheme()
    observer.observe(root, {
      attributeFilter: ['class'],
      attributes: true,
    })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!formatHtml) {
      setFormattedHtml(null)
      return
    }

    let cancelled = false

    import('~/lib/prettier/html-source-formatter')
      .then((mod) => mod.formatHtmlSource(html))
      .then((result) => {
        if (!cancelled) setFormattedHtml(result)
      })
      .catch(() => {
        if (!cancelled) setFormattedHtml(null)
      })

    return () => {
      cancelled = true
    }
  }, [formatHtml, html])

  useEffect(() => {
    if (!syntaxHighlight) {
      setHighlighted(null)
      return
    }

    let cancelled = false

    import('~/lib/shiki/html-source-highlighter')
      .then((mod) =>
        mod.highlightHtmlSource(
          sourceHtml,
          isDark ? 'github-dark' : 'github-light',
        ),
      )
      .then((result) => {
        if (!cancelled) setHighlighted(result)
      })
      .catch(() => {
        if (!cancelled) setHighlighted(null)
      })

    return () => {
      cancelled = true
    }
  }, [isDark, sourceHtml, syntaxHighlight])

  return (
    <div className="flex h-full min-h-0 flex-col font-mono text-[13px]/6">
      <div className="flex shrink-0 items-center gap-4 border-b border-border bg-surface px-3 py-1.5">
        <label className="flex items-center gap-2 text-[10px] text-secondary select-none">
          <input
            type="checkbox"
            checked={prettyPrint}
            onChange={(e) => onPrettyPrintChange(e.target.checked)}
            className="size-3"
          />
          <span>Pretty Print</span>
        </label>
        <label className="flex items-center gap-2 text-[10px] text-secondary select-none">
          <input
            type="checkbox"
            checked={formatHtml}
            onChange={(e) => onFormatHtmlChange(e.target.checked)}
            className="size-3"
          />
          <span>Format HTML</span>
        </label>
        <label className="flex items-center gap-2 text-[10px] text-secondary select-none">
          <input
            type="checkbox"
            checked={syntaxHighlight}
            onChange={(e) => onSyntaxHighlightChange(e.target.checked)}
            className="size-3"
          />
          <span>Syntax Highlight</span>
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="min-h-full">
          {lines.map((line, i) => {
            const edgePadding =
              (i === 0 ? 'pt-4 ' : '') + (i === lines.length - 1 ? 'pb-4' : '')

            return (
              <div
                // oxlint-disable-next-line react/no-array-index-key
                key={i}
                className="grid"
                style={{
                  gridTemplateColumns: `calc(${gutterWidth}ch + 0.5rem) minmax(0, 1fr)`,
                }}
              >
                <div
                  className={`border-r border-border bg-raised pr-1 text-right text-tertiary tabular-nums select-none ${edgePadding}`}
                  style={gutterStyle}
                >
                  {String(i + 1)}
                </div>
                <div
                  className={`min-w-0 px-4 text-primary ${prettyPrint ? 'break-all whitespace-pre-wrap' : 'whitespace-pre'} ${edgePadding}`}
                  style={
                    highlighted?.fg
                      ? ({ color: highlighted.fg } as CSSProperties)
                      : undefined
                  }
                >
                  {syntaxHighlight && highlighted
                    ? renderHighlightedLine(highlighted.tokens[i] ?? [])
                    : line || '\u00a0'}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function renderHighlightedLine(tokens: ThemedToken[]) {
  if (tokens.length === 0) return '\u00a0'

  return tokens.map((token, i) => (
    // oxlint-disable-next-line react/no-array-index-key
    <span key={i} style={getTokenStyle(token)}>
      {token.content}
    </span>
  ))
}

function getTokenStyle(token: ThemedToken): CSSProperties {
  if (token.htmlStyle) return token.htmlStyle

  return {
    backgroundColor: token.bgColor,
    color: token.color,
    fontStyle:
      token.fontStyle && (token.fontStyle & 1) !== 0 ? 'italic' : undefined,
    fontWeight:
      token.fontStyle && (token.fontStyle & 2) !== 0 ? '700' : undefined,
    textDecoration:
      token.fontStyle && (token.fontStyle & 4) !== 0 ? 'underline' : undefined,
  }
}
