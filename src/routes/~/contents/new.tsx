/* src/routes/~/contents/new.tsx */

import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getDb, getCache } from '~/server/platform'
import { upsertPost, getAllPosts } from '~/lib/database/posts'
import { writePostKv, writePostIndex } from '~/lib/storage/kv'
import { compile } from '~/lib/compiler/index'
import { computeContentHash } from '~/lib/utils/hash'
import { postSchema } from '~/lib/content/post-schema'
import type { PostIndexEntry } from '~/lib/storage/kv'

interface PostFormData {
  slug: string
  title: string
  description: string
  category: string
  tags: string
  content: string
  published: boolean
}

const createPost = createServerFn({ method: 'POST' })
  .inputValidator((input: PostFormData) => input)
  .handler(async ({ data }) => {
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

    const contentHash = computeContentHash(data.content)
    const result = await upsertPost(db, {
      slug: parsed.data.slug,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      tags: parsed.data.tags,
      content: parsed.data.content,
      contentHash,
      published: parsed.data.published,
    })

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
    }

    // Rebuild post index
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

export const Route = createFileRoute('/~/contents/new')({
  component: NewPost,
})

function NewPost() {
  const navigate = useNavigate()
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setErrors([])

    const fd = new FormData(e.currentTarget)
    const result = await createPost({
      data: {
        slug: fd.get('slug') as string,
        title: fd.get('title') as string,
        description: fd.get('description') as string,
        category: fd.get('category') as string,
        tags: fd.get('tags') as string,
        content: fd.get('content') as string,
        published: fd.get('published') === 'on',
      },
    })

    if (!result.ok) {
      setErrors(result.errors)
      setSaving(false)
      return
    }

    navigate({ to: '/~/contents' })
  }

  return (
    <div>
      <h1 className="mb-6 text-lg font-medium">New Post</h1>
      <PostForm onSubmit={handleSubmit} errors={errors} saving={saving} />
    </div>
  )
}

export function PostForm({
  onSubmit,
  errors,
  saving,
  initial,
}: {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  errors: string[]
  saving: boolean
  initial?: {
    slug: string
    title: string
    description: string
    category: string
    tags: string
    content: string
    published: boolean
  }
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {errors.length > 0 && (
        <div className="rounded-sm border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {errors.map((err) => (
            <div key={err}>{err}</div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="mb-1 block text-sm text-secondary">Slug</span>
          <input
            name="slug"
            defaultValue={initial?.slug}
            required
            className="w-full rounded-sm border border-border bg-surface px-3 py-1.5 text-sm text-primary outline-none focus:border-secondary"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-secondary">Category</span>
          <input
            name="category"
            defaultValue={initial?.category}
            required
            className="w-full rounded-sm border border-border bg-surface px-3 py-1.5 text-sm text-primary outline-none focus:border-secondary"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm text-secondary">Title</span>
        <input
          name="title"
          defaultValue={initial?.title}
          required
          className="w-full rounded-sm border border-border bg-surface px-3 py-1.5 text-sm text-primary outline-none focus:border-secondary"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-secondary">Description</span>
        <input
          name="description"
          defaultValue={initial?.description}
          className="w-full rounded-sm border border-border bg-surface px-3 py-1.5 text-sm text-primary outline-none focus:border-secondary"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-secondary">
          Tags (comma-separated)
        </span>
        <input
          name="tags"
          defaultValue={initial?.tags}
          className="w-full rounded-sm border border-border bg-surface px-3 py-1.5 text-sm text-primary outline-none focus:border-secondary"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-secondary">Content</span>
        <textarea
          name="content"
          defaultValue={initial?.content}
          required
          rows={20}
          className="w-full rounded-sm border border-border bg-surface px-3 py-2 font-mono text-sm text-primary outline-none focus:border-secondary"
        />
      </label>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="published"
            defaultChecked={initial?.published}
          />
          <span className="text-secondary">Publish</span>
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-sm bg-primary px-4 py-1.5 text-sm text-surface disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  )
}
