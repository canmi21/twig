/* src/routes/@/editor/$cid/index.tsx */

import { useState, useRef, useCallback, lazy, Suspense } from 'react'
import { createFileRoute, useRouteContext } from '@tanstack/react-router'
import { serializeFrontmatter } from '~/lib/compiler/frontmatter'
import type { Frontmatter } from '~/lib/compiler/index'
import { getPost, savePost, uploadMedia } from '~/server/editor-api'
import {
  EditorToolbar,
  type EditorMode,
  type ToolbarAction,
} from '~/components/editor/editor-toolbar'
import { MetadataPanel } from '~/components/editor/metadata-panel'
import { RawEditor } from '~/components/editor/raw-editor'
import type { PasteImageHandler } from '~/components/editor/plugins'
import { ArticleHeader } from '~/components/post/article-header'
import { PostShareActions } from '~/components/post/share-actions'
import postPageCss from '~/styles/post/page.css?url'

// Milkdown is client-only
const MilkdownEditor = lazy(() => import('~/components/editor/milkdown-editor'))

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export const Route = createFileRoute('/@/editor/$cid/')({
  validateSearch: (search: Record<string, unknown>) => ({
    view: search.view === 'raw' ? ('raw' as const) : ('wysiwyg' as const),
  }),
  loader: ({ params }) => getPost({ data: { cid: params.cid } }),
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: `Editor - ${loaderData.title}` }] : [],
    links: [{ rel: 'stylesheet', href: postPageCss }],
  }),
  component: EditorPage,
})

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function EditorPage() {
  const post = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { cdnPublicUrl, siteTimezone } = useRouteContext({ from: '__root__' })
  const cdnPrefix = import.meta.env.DEV ? '/api/object' : cdnPublicUrl

  // --- State: metadata (separated from content) ---
  const [metadata, setMetadata] = useState<Frontmatter>(() => ({
    cid: post.cid,
    title: post.title,
    description: post.description ?? undefined,
    tags: post.tags ? (JSON.parse(post.tags) as string[]) : undefined,
    tweet: post.tweet ?? undefined,
    created_at: post.createdAt,
    updated_at: post.updatedAt,
    published: post.published === 1,
  }))
  const [slug, setSlug] = useState(post.slug)
  const [category, setCategory] = useState(post.category ?? '')

  // --- State: content ---
  const [markdown, setMarkdown] = useState(post.content)
  const markdownRef = useRef(post.content)

  // Keep ref in sync for view switching
  const handleMarkdownChange = useCallback((md: string) => {
    markdownRef.current = md
    setMarkdown(md)
  }, [])

  // --- State: editor view ---
  const view: EditorMode = search.view ?? 'wysiwyg'
  // Key to force Milkdown remount on view switch
  const [milkdownKey, setMilkdownKey] = useState(0)

  function handleModeChange(next: EditorMode) {
    if (next === view) return
    if (next === 'raw') {
      // Extract current markdown from Milkdown via ref
      if (getMarkdownRef.current) {
        const current = getMarkdownRef.current()
        markdownRef.current = current
        setMarkdown(current)
      }
    } else {
      // Switching to WYSIWYG: remount with current markdown
      setMilkdownKey((k) => k + 1)
    }
    navigate({ search: { view: next }, replace: true })
  }

  // Ref for extracting markdown from Milkdown
  const getMarkdownRef = useRef<(() => string) | null>(null)

  // --- State: metadata panel ---
  const [metadataOpen, setMetadataOpen] = useState(false)

  // --- State: save ---
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  // --- Paste image handler (shared between views) ---
  const handlePasteImage: PasteImageHandler = useCallback(
    async (file: File) => {
      const buf = await file.arrayBuffer()
      const bytes = new Uint8Array(buf)
      let binary = ''
      for (let i = 0; i < bytes.length; i++)
        binary += String.fromCharCode(bytes[i])
      const base64 = btoa(binary)

      const result = await uploadMedia({
        data: { cid: post.cid, base64, mime: file.type },
      })

      if (result.ok) return result.src
      return null
    },
    [post.cid],
  )

  // --- Save handler ---
  async function handleSave() {
    setSaving(true)
    setFeedback(null)

    // Get latest markdown from the active editor
    let currentMarkdown = markdownRef.current
    if (view === 'wysiwyg' && getMarkdownRef.current) {
      currentMarkdown = getMarkdownRef.current()
    }

    // Reconstruct full source (frontmatter + content)
    const source = `${serializeFrontmatter(metadata)}\n\n${currentMarkdown}`

    try {
      const result = await savePost({
        data: { cid: post.cid, slug, category, source },
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

  // --- Toolbar action handler (formatting commands for Milkdown) ---
  const handleAction: ToolbarAction = useCallback(
    (type, payload) => {
      if (view !== 'wysiwyg') return

      // Actions are dispatched via a custom event that MilkdownEditor listens to
      window.dispatchEvent(
        new CustomEvent('milkdown-action', {
          detail: { type, payload },
        }),
      )
    },
    [view],
  )

  // --- Keyboard shortcut: Cmd+S ---
  const handleSaveRef = useRef(handleSave)
  handleSaveRef.current = handleSave

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      handleSaveRef.current()
    }
  }, [])

  function handleMetadataChange(update: Partial<Frontmatter>) {
    setMetadata((prev) => ({ ...prev, ...update }))
  }

  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className="relative flex h-screen flex-col bg-surface"
      onKeyDown={handleKeyDown}
    >
      <EditorToolbar
        view={view}
        onViewChange={handleModeChange}
        onAction={handleAction}
        onMetadataToggle={() => setMetadataOpen((o) => !o)}
        onSave={handleSave}
        saving={saving}
        feedback={feedback}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {view === 'wysiwyg' ? (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-sm text-secondary">
                Loading editor...
              </div>
            }
          >
            {/* eslint-disable-next-line better-tailwindcss/no-unknown-classes */}
            <div className="post mx-auto max-w-190 px-5 pt-8 pb-16 text-primary">
              <ArticleHeader
                title={metadata.title ?? 'Untitled'}
                createdAt={metadata.created_at}
                timeZone={siteTimezone}
                text={markdown}
              >
                <PostShareActions cid={post.cid} tweet={metadata.tweet} />
              </ArticleHeader>
              <MilkdownEditor
                key={milkdownKey}
                defaultValue={markdownRef.current}
                onMarkdownChange={handleMarkdownChange}
                onPasteImage={handlePasteImage}
                cdnPrefix={cdnPrefix}
                getMarkdownRef={getMarkdownRef}
              />
            </div>
          </Suspense>
        ) : (
          <div
            className="mx-auto flex max-w-190 flex-col"
            style={{ minHeight: '100%' }}
          >
            <RawEditor
              value={markdown}
              onChange={handleMarkdownChange}
              onPasteImage={handlePasteImage}
            />
          </div>
        )}
      </div>

      <MetadataPanel
        open={metadataOpen}
        onClose={() => setMetadataOpen(false)}
        metadata={metadata}
        onMetadataChange={handleMetadataChange}
        slug={slug}
        onSlugChange={setSlug}
        category={category}
        onCategoryChange={setCategory}
        timeZone={siteTimezone}
      />
    </div>
  )
}
