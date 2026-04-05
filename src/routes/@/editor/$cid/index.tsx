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
import { getDb, getCache, getBucket } from '~/server/platform'
import { getPostByCid, upsertPost, getAllPosts } from '~/lib/database/posts'
import {
  writePostKv,
  deletePostKv,
  writePostIndex,
  toPostIndexEntry,
} from '~/lib/storage/kv'
import { computeContentHash } from '~/lib/utils/hash'
import { storageKey } from '~/lib/storage/storage-key'
import {
  getMediaByHash,
  insertMedia,
  upsertMediaRef,
} from '~/lib/database/media'
import { postSchema } from '~/lib/content/post-schema'
import { verifyCfAccess } from '~/server/auth'
import { ArrowLeft, Eye, CodeXml, Save, Sun, Moon } from 'lucide-react'
import { motion } from 'motion/react'
import { ArticleHeader } from '~/components/post/article-header'
import { PostShareActions } from '~/components/post/share-actions'
import { toggleDocumentTheme } from '~/components/theme-toggle'
import {
  serializeFrontmatter,
  extractFrontmatterSource,
} from '~/lib/compiler/frontmatter'
import type { PreviewResult } from '~/lib/compiler/compile-preview'
import type { Frontmatter, ComponentEntry } from '~/lib/compiler/index'
import { PostRenderer } from '~/components/post/renderer'
import type { HtmlSourceHighlightResult } from '~/lib/shiki/html-source-highlighter'
import type { ThemedToken } from 'shiki/core'
import postPageCss from '~/styles/post/page.css?url'

const DEFAULT_SPLIT = 0.5
const MIN_SPLIT = 0.25
const MAX_SPLIT = 0.75

function parseActiveSearch(value: unknown): boolean | undefined {
  if (value === true || value === 'true') return true
  return undefined
}

function buildEditorSource(frontmatter: Frontmatter, content: string) {
  return `${serializeFrontmatter(frontmatter)}\n\n${content}`
}

function ToolbarThemeButton() {
  const [isDark, setIsDark] = useState(false)

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

  return (
    <button
      type="button"
      onClick={toggleDocumentTheme}
      aria-label="Toggle theme"
      title="Toggle theme"
      className="rounded-full p-2 text-secondary transition-colors hover:text-primary"
    >
      {isDark ? (
        <Sun className="size-3.5" strokeWidth={1.8} />
      ) : (
        <Moon className="size-3.5" strokeWidth={1.8} />
      )}
    </button>
  )
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
  category: string
  source: string
}

const savePost = createServerFn({ method: 'POST' })
  .inputValidator((input: SavePostData) => input)
  .handler(async ({ data }) => {
    if (!import.meta.env.DEV) {
      const identity = await verifyCfAccess(getRequest())
      if (!identity) throw new Error('Unauthorized')
    }

    let extracted: ReturnType<typeof extractFrontmatterSource>
    try {
      extracted = extractFrontmatterSource(data.source)
    } catch (error) {
      return {
        ok: false as const,
        errors: [
          error instanceof Error ? error.message : 'Frontmatter parse failed',
        ],
      }
    }

    if (extracted.frontmatter.cid && extracted.frontmatter.cid !== data.cid) {
      return {
        ok: false as const,
        errors: ['cid in frontmatter does not match current post'],
      }
    }

    const parsed = postSchema.safeParse({
      slug: data.slug,
      title: extracted.frontmatter.title,
      description: extracted.frontmatter.description,
      category: data.category,
      tags: extracted.frontmatter.tags,
      tweet: extracted.frontmatter.tweet,
      content: extracted.content,
      cid: extracted.frontmatter.cid ?? data.cid,
      created_at: extracted.frontmatter.created_at,
      updated_at: extracted.frontmatter.updated_at,
      published: extracted.frontmatter.published,
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

    const contentHash = computeContentHash(extracted.content)
    const result = await upsertPost(db, {
      slug: parsed.data.slug,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      tags: parsed.data.tags,
      tweet: parsed.data.tweet,
      content: extracted.content,
      contentHash,
      cid: parsed.data.cid,
      createdAt: parsed.data.created_at,
      updatedAt: parsed.data.updated_at,
      published: parsed.data.published,
    })

    if (oldSlug && oldSlug !== result.slug) {
      await deletePostKv(kv, oldSlug)
    }

    if (parsed.data.published) {
      const { compile } = await import('~/lib/compiler/index')
      const compiled = await compile(extracted.content)
      const savedPost = await getPostByCid(db, result.cid)

      await writePostKv(kv, result.slug, {
        frontmatter: {
          title: parsed.data.title,
          description: parsed.data.description,
          category: parsed.data.category,
          tags: parsed.data.tags,
          tweet: parsed.data.tweet,
          cid: result.cid,
          created_at: savedPost?.createdAt ?? parsed.data.created_at,
          updated_at: savedPost?.updatedAt ?? parsed.data.updated_at,
          published: parsed.data.published,
        },
        html: compiled.html,
        toc: compiled.toc,
        components: compiled.components,
      })
    } else {
      await deletePostKv(kv, result.slug)
    }

    const allPosts = await getAllPosts(db)
    await writePostIndex(kv, allPosts.map(toPostIndexEntry))

    return { ok: true as const }
  })

interface UploadMediaData {
  cid: string
  base64: string
  mime: string
}

const extFromMime: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
}

const uploadMedia = createServerFn({ method: 'POST' })
  .inputValidator((input: UploadMediaData) => input)
  .handler(async ({ data }) => {
    if (!import.meta.env.DEV) {
      const identity = await verifyCfAccess(getRequest())
      if (!identity) throw new Error('Unauthorized')
    }

    const ext = extFromMime[data.mime]
    if (!ext)
      return { ok: false as const, error: `Unsupported type: ${data.mime}` }

    const raw = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0))
    const hashBuf = await crypto.subtle.digest('SHA-256', raw)
    const hash = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    const db = getDb()
    const bucket = getBucket()
    const key = storageKey(hash, ext)

    const existing = await getMediaByHash(db, hash)
    if (!existing) {
      await bucket.put(key, raw, { httpMetadata: { contentType: data.mime } })
      await insertMedia(db, {
        hash,
        ext,
        mime: data.mime,
        size: raw.byteLength,
        createdAt: new Date().toISOString(),
      })
    }

    await upsertMediaRef(db, hash, data.cid)
    return { ok: true as const, src: `${hash}.${ext}` }
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
    links: [{ rel: 'stylesheet', href: postPageCss }],
  }),
  component: EditorPage,
})

// --- Component ---

function EditorPage() {
  const post = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const initialFrontmatter: Frontmatter = {
    cid: post.cid,
    title: post.title,
    description: post.description ?? undefined,
    tags: post.tags ? (JSON.parse(post.tags) as string[]) : undefined,
    tweet: post.tweet ?? undefined,
    created_at: post.createdAt,
    updated_at: post.updatedAt,
    published: post.published === 1,
  }

  const [slug, setSlug] = useState(post.slug)
  const [category, setCategory] = useState(post.category ?? '')
  const [source, setSource] = useState(() =>
    buildEditorSource(initialFrontmatter, post.content),
  )
  const [parsedFrontmatter, setParsedFrontmatter] =
    useState<Frontmatter>(initialFrontmatter)
  const [parsedContent, setParsedContent] = useState(post.content)
  const [sourceError, setSourceError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const [previewHtml, setPreviewHtml] = useState('')
  const [previewComponents, setPreviewComponents] = useState<ComponentEntry[]>(
    [],
  )
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
  const previewTitle = parsedFrontmatter.title || post.title
  const previewCreatedAt = parsedFrontmatter.created_at ?? post.createdAt

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

  useEffect(() => {
    try {
      const extracted = extractFrontmatterSource(source)
      setParsedFrontmatter(extracted.frontmatter)
      setParsedContent(extracted.content)
      setSourceError(null)
    } catch (error) {
      setParsedFrontmatter({ title: '' })
      setParsedContent('')
      setSourceError(
        error instanceof Error ? error.message : 'Frontmatter parse failed',
      )
    }
  }, [source])

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
      if (sourceError) {
        setPreviewHtml('')
        setCompileError(sourceError)
        return
      }

      try {
        const result = await compiler.compilePreview(parsedContent)

        setPreviewHtml(result.html)
        setPreviewComponents(result.components)
        setCompileError(null)
      } catch (err) {
        setCompileError(err instanceof Error ? err.message : 'Compile failed')
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [compilerReady, parsedContent, sourceError])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        const ta = e.currentTarget
        const start = ta.selectionStart
        const end = ta.selectionEnd
        const next =
          ta.value.substring(0, start) + '\t' + ta.value.substring(end)
        setSource(next)
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 1
        })
      }
    },
    [],
  )

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const file = Array.from(e.clipboardData.items)
        .find((item) => item.type.startsWith('image/'))
        ?.getAsFile()
      if (!file) return

      e.preventDefault()
      const ta = e.currentTarget
      const start = ta.selectionStart
      const end = ta.selectionEnd

      // Insert placeholder while uploading
      const placeholder = '::image{src="uploading..." alt=""}'
      const before = source.substring(0, start)
      const after = source.substring(end)
      setSource(before + placeholder + after)

      try {
        const buf = await file.arrayBuffer()
        const bytes = new Uint8Array(buf)
        let binary = ''
        for (let i = 0; i < bytes.length; i++)
          binary += String.fromCharCode(bytes[i])
        const base64 = btoa(binary)
        const result = await uploadMedia({
          data: { cid: post.cid, base64, mime: file.type },
        })

        if (result.ok) {
          const directive = `::image{src="${result.src}" alt=""}`
          setSource((prev) => prev.replace(placeholder, directive))
        } else {
          setSource((prev) =>
            prev.replace(
              placeholder,
              `<!-- upload failed: ${result.error} -->`,
            ),
          )
        }
      } catch (err) {
        setSource((prev) =>
          prev.replace(
            placeholder,
            `<!-- upload failed: ${err instanceof Error ? err.message : 'unknown'} -->`,
          ),
        )
      }
    },
    [source, post.cid],
  )

  async function handleSave() {
    setSaving(true)
    setFeedback(null)

    try {
      const result = await savePost({
        data: {
          cid: post.cid,
          slug,
          category,
          source,
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
    <div className="relative flex h-screen flex-col bg-surface">
      {/* Toolbar */}
      <header className="flex shrink-0 items-center gap-1 border-b border-border px-3 py-1.5">
        <Link
          to="/@/contents"
          className="rounded-sm p-1.5 text-secondary hover:bg-raised hover:text-primary"
        >
          <ArrowLeft className="size-3.5" strokeWidth={1.8} />
        </Link>
        <div className="flex-1" />
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
      </header>

      {/* Editor + Preview with resizable split */}
      <div ref={containerRef} className="flex min-h-0 flex-1">
        {/* Left: textarea */}
        <div
          className="flex min-w-0 flex-col overflow-hidden"
          style={{ width: leftPercent }}
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2">
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="slug"
              className={`${inputClass} min-w-0 flex-1`}
            />
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="category"
              className={`${inputClass} w-28 shrink-0`}
            />
          </div>
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
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
              <div className="mx-auto max-w-180 px-5 pt-4 pb-24">
                <ArticleHeader
                  title={previewTitle}
                  createdAt={previewCreatedAt}
                  html={previewHtml}
                >
                  <PostShareActions />
                </ArticleHeader>
                {!compilerReady ? null : compileError ? (
                  <div className="rounded-sm border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                    {compileError}
                  </div>
                ) : (
                  // eslint-disable-next-line better-tailwindcss/no-unknown-classes
                  <div className="article">
                    <PostRenderer
                      html={previewHtml}
                      components={previewComponents}
                    />
                  </div>
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
            <div className="pointer-events-auto flex items-center gap-px rounded-full border border-border bg-surface px-0.5 shadow-sm">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                aria-label="Save"
                title={saving ? 'Saving...' : 'Save'}
                className="rounded-full p-2 text-secondary transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="size-3.5" strokeWidth={1.8} />
              </button>
              <ToolbarThemeButton />
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
          <div
            className="grid"
            style={{
              gridTemplateColumns: `calc(${gutterWidth}ch + 0.5rem) minmax(0, 1fr)`,
            }}
          >
            <div className="h-1 border-r border-border bg-raised" />
            <div />
          </div>
          {lines.map((line, i) => {
            const edgePadding = i === lines.length - 1 ? 'pb-4' : ''

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
