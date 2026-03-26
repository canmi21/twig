/* src/routes/~/contents/$cid/edit.tsx */

import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getDb, getCache } from '~/server/platform'
import { getPostByCid, upsertPost, getAllPosts } from '~/lib/database/posts'
import { writePostKv, deletePostKv, writePostIndex } from '~/lib/storage/kv'
import { compile } from '~/lib/compiler/index'
import { computeContentHash } from '~/lib/utils/hash'
import { postSchema } from '~/lib/content/post-schema'
import { PostForm } from '../new'
import type { PostIndexEntry } from '~/lib/storage/kv'

interface PostFormData {
  cid: string
  slug: string
  title: string
  description: string
  category: string
  tags: string
  content: string
  published: boolean
}

const getPost = createServerFn({ method: 'GET' })
  .inputValidator((input: { cid: string }) => input)
  .handler(async ({ data }) => {
    const db = getDb()
    const post = await getPostByCid(db, data.cid)
    if (!post) throw new Error('Post not found')
    return post
  })

const updatePost = createServerFn({ method: 'POST' })
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

    // Get old post to check slug change
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

    // Clean up old KV entry if slug changed
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

export const Route = createFileRoute('/~/contents/$cid/edit')({
  loader: ({ params }) => getPost({ data: { cid: params.cid } }),
  component: EditPost,
})

function EditPost() {
  const post = Route.useLoaderData()
  const navigate = useNavigate()
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setErrors([])

    const fd = new FormData(e.currentTarget)
    const result = await updatePost({
      data: {
        cid: post.cid,
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
      <h1 className="mb-6 text-lg font-medium">Edit Post</h1>
      <PostForm
        onSubmit={handleSubmit}
        errors={errors}
        saving={saving}
        initial={{
          slug: post.slug,
          title: post.title,
          description: post.description ?? '',
          category: post.category ?? '',
          tags: post.tags ? (JSON.parse(post.tags) as string[]).join(', ') : '',
          content: post.content,
          published: post.published === 1,
        }}
      />
    </div>
  )
}
