/* src/routes/@/_dashboard/contents/index.tsx */

import { useState } from 'react'
import {
  createFileRoute,
  Link,
  useRouter,
  useNavigate,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { motion, AnimatePresence } from 'motion/react'
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
    navigate({
      to: '/@/editor/$cid',
      params: { cid },
      search: {
        preview: 'rendered',
        pretty: undefined,
        format: true,
        highlight: true,
      },
    })
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
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="mb-8 flex items-center justify-between"
      >
        <div>
          <h1 className="text-[17px] font-medium">Posts</h1>
          <p className="mt-1 text-[13px] text-secondary">
            {posts.length} total
          </p>
        </div>
        <button
          type="button"
          onClick={handleNewPost}
          className="rounded-sm bg-foreground px-3 py-1.5 text-sm text-surface"
        >
          New Post
        </button>
      </motion.div>

      {posts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="py-16 text-center"
        >
          <p className="text-[14px] text-secondary">No posts yet.</p>
          <p className="mt-1 text-[12px] text-dim">
            Create your first post to get started.
          </p>
        </motion.div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-boundary text-left text-secondary">
              <th className="pb-2 font-normal">Title</th>
              <th className="pb-2 font-normal">Category</th>
              <th className="pb-2 font-normal">Status</th>
              <th className="pb-2 font-normal">Created</th>
              <th className="pb-2 text-right font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post, i) => (
              <motion.tr
                key={post.cid}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                className="border-b border-boundary transition-colors hover:bg-muted/50"
              >
                <td className="py-3">
                  <div className="text-[14px] font-medium">{post.title}</div>
                  <div className="text-[12px] text-dim">{post.slug}</div>
                </td>
                <td className="py-3 text-[13px] text-secondary">
                  {post.category ?? '-'}
                </td>
                <td className="py-3">
                  <AnimatePresence mode="wait">
                    <motion.button
                      key={post.published}
                      type="button"
                      onClick={() => handleToggle(post.cid, post.published)}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className={`rounded-sm px-2 py-0.5 text-xs ${
                        post.published === 1
                          ? 'bg-success-subtle text-success'
                          : 'bg-muted text-secondary'
                      }`}
                    >
                      {post.published === 1 ? 'Published' : 'Draft'}
                    </motion.button>
                  </AnimatePresence>
                </td>
                <td className="py-3 text-[13px] text-secondary">
                  {formatDate(post.createdAt)}
                </td>
                <td className="py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      to="/@/editor/$cid"
                      params={{ cid: post.cid }}
                      search={{
                        preview: 'rendered',
                        pretty: undefined,
                        format: true,
                        highlight: true,
                      }}
                      className="text-secondary transition-colors hover:text-foreground"
                    >
                      Edit
                    </Link>
                    <AnimatePresence mode="wait">
                      {deleting === post.cid ? (
                        <motion.span
                          key="confirm"
                          className="flex items-center gap-2"
                          initial={{ opacity: 0, x: 4 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -4 }}
                          transition={{ duration: 0.15 }}
                        >
                          <button
                            type="button"
                            onClick={() => handleDelete(post.cid)}
                            className="text-danger"
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
                        </motion.span>
                      ) : (
                        <motion.button
                          key="delete"
                          type="button"
                          onClick={() => setDeleting(post.cid)}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="text-secondary transition-colors hover:text-danger"
                        >
                          Delete
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
