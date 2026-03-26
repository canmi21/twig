/* src/routes/@/editor/$cid/index.tsx */

import { useState, useEffect, useRef, useCallback } from 'react'
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
import type { PreviewResult } from '~/lib/compiler/compile-preview'

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
  loader: ({ params }) => getPost({ data: { cid: params.cid } }),
  component: EditorPage,
})

// --- Component ---

function EditorPage() {
  const post = Route.useLoaderData()

  const [slug, setSlug] = useState(post.slug)
  const [title, setTitle] = useState(post.title)
  const [category, setCategory] = useState(post.category ?? '')
  const [tags, setTags] = useState(
    post.tags ? (JSON.parse(post.tags) as string[]).join(', ') : '',
  )
  const [description, setDescription] = useState(post.description ?? '')
  const [content, setContent] = useState(post.content)
  const [published, setPublished] = useState(post.published === 1)

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

  return (
    <div className="flex h-screen flex-col bg-surface">
      {/* Top bar */}
      <header className="shrink-0 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Link
            to="/@/contents"
            className="mr-1 text-sm text-secondary hover:text-primary"
          >
            &larr;
          </Link>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="slug"
            className={`${inputClass} w-32`}
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className={`${inputClass} min-w-0 flex-1`}
          />
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="category"
            className={`${inputClass} w-24`}
          />
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="tags"
            className={`${inputClass} w-32`}
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="description"
            className={`${inputClass} w-40`}
          />
          <label className="flex shrink-0 items-center gap-1.5 text-sm">
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
            className="shrink-0 rounded-sm bg-primary px-3 py-1 text-sm text-surface disabled:opacity-50"
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
        </div>
      </header>
      {/* Editor + Preview */}
      <div className="flex min-h-0 flex-1">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-full flex-1 resize-none border-none bg-surface p-4 font-mono text-[13px]/6 text-primary outline-none"
          spellCheck={false}
        />
        <div className="flex-1 overflow-y-auto border-l border-border p-6">
          {!compilerReady ? (
            <p className="text-sm text-secondary">Loading preview...</p>
          ) : compileError ? (
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
      </div>
    </div>
  )
}
