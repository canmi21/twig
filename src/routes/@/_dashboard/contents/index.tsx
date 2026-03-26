/* src/routes/@/_dashboard/contents/index.tsx */

import { useState } from 'react'
import {
  createFileRoute,
  Link,
  useRouter,
  useNavigate,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getDb, getCache, getBucket } from '~/server/platform'
import {
  getAllPosts,
  deletePost,
  setPublished,
  getPostByCid,
  upsertPost,
} from '~/lib/database/posts'
import {
  deleteMediaRefsForPost,
  getMediaRefCount,
  getMediaByHash,
  deleteMedia,
} from '~/lib/database/media'
import { writePostKv, deletePostKv, writePostIndex } from '~/lib/storage/kv'
import { compile } from '~/lib/compiler/index'
import { storageKey } from '~/lib/storage/storage-key'
import { newCid } from '~/lib/utils/uuid'
import { computeContentHash } from '~/lib/utils/hash'
import type { PostIndexEntry } from '~/lib/storage/kv'

const listPosts = createServerFn().handler(async () => {
  const db = getDb()
  return getAllPosts(db)
})

const createDraft = createServerFn({ method: 'POST' }).handler(async () => {
  const db = getDb()
  const cid = newCid()
  const contentHash = computeContentHash('')
  await upsertPost(db, {
    slug: `untitled-${cid.slice(0, 8)}`,
    title: 'Untitled',
    content: '',
    contentHash,
    cid,
    published: false,
  })
  return { cid }
})

const togglePublished = createServerFn({ method: 'POST' })
  .inputValidator((input: { cid: string; published: boolean }) => input)
  .handler(async ({ data }) => {
    const db = getDb()
    const kv = getCache()

    await setPublished(db, data.cid, data.published)

    const post = await getPostByCid(db, data.cid)
    if (!post) return

    if (data.published) {
      const compiled = await compile(post.content)
      await writePostKv(kv, post.slug, {
        frontmatter: {
          title: post.title,
          description: post.description ?? undefined,
          category: post.category ?? undefined,
          tags: post.tags ? JSON.parse(post.tags) : undefined,
          cid: post.cid,
          created_at: post.createdAt,
          updated_at: post.updatedAt,
          published: true,
        },
        html: compiled.html,
        toc: compiled.toc,
        components: compiled.components,
      })
    } else {
      await deletePostKv(kv, post.slug)
    }

    await rebuildPostIndex(db, kv)
  })

const removePost = createServerFn({ method: 'POST' })
  .inputValidator((input: { cid: string }) => input)
  .handler(async ({ data }) => {
    const db = getDb()
    const kv = getCache()
    const r2 = getBucket()

    const post = await getPostByCid(db, data.cid)
    if (!post) return

    const hashes = await deleteMediaRefsForPost(db, data.cid)
    const refCounts = await Promise.all(
      hashes.map((hash) =>
        getMediaRefCount(db, hash).then((c) => ({ hash, c })),
      ),
    )
    const orphaned = refCounts.filter((r) => r.c === 0).map((r) => r.hash)
    const mediaRows = await Promise.all(
      orphaned.map((hash) => getMediaByHash(db, hash)),
    )
    await Promise.all(
      mediaRows
        .filter((row): row is NonNullable<typeof row> => row != null)
        .flatMap((row) => [
          r2.delete(storageKey(row.hash, row.ext)),
          deleteMedia(db, row.hash),
        ]),
    )

    await deletePost(db, data.cid)
    await deletePostKv(kv, post.slug)
    await rebuildPostIndex(db, kv)
  })

async function rebuildPostIndex(db: ReturnType<typeof getDb>, kv: KVNamespace) {
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
}

export const Route = createFileRoute('/@/_dashboard/contents/')({
  loader: () => listPosts(),
  component: PostsList,
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function PostsList() {
  const posts = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleNewPost() {
    const { cid } = await createDraft()
    navigate({ to: '/@/editor/$cid', params: { cid } })
  }

  async function handleToggle(cid: string, current: number) {
    await togglePublished({ data: { cid, published: current === 0 } })
    router.invalidate()
  }

  async function handleDelete(cid: string) {
    await removePost({ data: { cid } })
    setDeleting(null)
    router.invalidate()
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-medium">Posts</h1>
        <button
          type="button"
          onClick={handleNewPost}
          className="rounded-sm bg-primary px-3 py-1.5 text-sm text-surface"
        >
          New Post
        </button>
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-secondary">No posts yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-secondary">
              <th className="pb-2 font-normal">Title</th>
              <th className="pb-2 font-normal">Category</th>
              <th className="pb-2 font-normal">Status</th>
              <th className="pb-2 font-normal">Created</th>
              <th className="pb-2 text-right font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.cid} className="border-b border-border">
                <td className="py-3">
                  <div className="font-medium">{post.title}</div>
                  <div className="text-xs text-secondary">{post.slug}</div>
                </td>
                <td className="py-3 text-secondary">{post.category ?? '-'}</td>
                <td className="py-3">
                  <button
                    type="button"
                    onClick={() => handleToggle(post.cid, post.published)}
                    className={`rounded-sm px-2 py-0.5 text-xs ${
                      post.published === 1
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-raised text-secondary'
                    }`}
                  >
                    {post.published === 1 ? 'Published' : 'Draft'}
                  </button>
                </td>
                <td className="py-3 text-secondary">
                  {formatDate(post.createdAt)}
                </td>
                <td className="py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      to="/@/editor/$cid"
                      params={{ cid: post.cid }}
                      className="text-secondary hover:text-primary"
                    >
                      Edit
                    </Link>
                    {deleting === post.cid ? (
                      <span className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDelete(post.cid)}
                          className="text-red-500"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(null)}
                          className="text-secondary"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleting(post.cid)}
                        className="text-secondary hover:text-red-500"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
