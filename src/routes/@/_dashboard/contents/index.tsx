/* src/routes/@/_dashboard/contents/index.tsx */

import { useState } from 'react'
import {
  createFileRoute,
  Link,
  useRouter,
  useNavigate,
  useRouteContext,
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
import {
  writePostKv,
  deletePostKv,
  writePostIndex,
  toPostIndexEntry,
  parseTagsJson,
} from '~/lib/storage/kv'
import { formatDateShort } from '~/lib/utils/date'
import { compile } from '~/lib/compiler/index'
import { storageKey } from '~/lib/storage/storage-key'
import { newCid } from '~/lib/utils/uuid'
import { computeContentHash } from '~/lib/utils/hash'
import { requireAdmin } from '~/server/admin-guard'
import { getAllReadCounts, setReadCount } from '~/server/read-count-admin'

const listPosts = createServerFn().handler(async () => {
  await requireAdmin()
  const db = getDb()
  return getAllPosts(db)
})

const createDraft = createServerFn({ method: 'POST' }).handler(async () => {
  await requireAdmin()
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
    await requireAdmin()
    const db = getDb()
    const kv = getCache()

    // Read the current row BEFORE flipping contents.published. The D1
    // write is the commit marker and must not happen until the KV side
    // is already in the right state for the new published value.
    const post = await getPostByCid(db, data.cid)
    if (!post) return

    if (data.published) {
      // Publish: compile and write KV first so readers see the post the
      // moment the D1 flag flips. If compile or writePostKv throws,
      // contents.published stays at its old value and the user can
      // retry from the dashboard without an inconsistent state.
      const compiled = await compile(post.content)
      await writePostKv(kv, post.slug, {
        frontmatter: {
          title: post.title,
          description: post.description ?? undefined,
          category: post.category ?? undefined,
          tags: parseTagsJson(post.tags),
          tweet: post.tweet ?? undefined,
          cid: post.cid,
          created_at: post.createdAt,
          updated_at: post.updatedAt,
          published: true,
        },
        html: compiled.html,
        text: compiled.text,
        toc: compiled.toc,
        components: compiled.components,
      })
      await setPublished(db, data.cid, true)
    } else {
      // Unpublish: remove KV entry first so readers stop seeing the post
      // before the D1 flag flips. If deletePostKv throws, the post stays
      // published in both D1 and KV — a safe, retryable state.
      await deletePostKv(kv, post.slug)
      await setPublished(db, data.cid, false)
    }

    await rebuildPostIndex(db, kv)
  })

const rebuildPostKv = createServerFn({ method: 'POST' })
  .inputValidator((input: { cid: string }) => input)
  .handler(async ({ data }) => {
    await requireAdmin()
    const db = getDb()
    const kv = getCache()

    const post = await getPostByCid(db, data.cid)
    if (!post || post.published !== 1) {
      return { rebuilt: false as const }
    }

    const compiled = await compile(post.content)
    await writePostKv(kv, post.slug, {
      frontmatter: {
        title: post.title,
        description: post.description ?? undefined,
        category: post.category ?? undefined,
        tags: parseTagsJson(post.tags),
        tweet: post.tweet ?? undefined,
        cid: post.cid,
        created_at: post.createdAt,
        updated_at: post.updatedAt,
        published: true,
      },
      html: compiled.html,
      text: compiled.text,
      toc: compiled.toc,
      components: compiled.components,
    })

    return { rebuilt: true as const }
  })

const removePost = createServerFn({ method: 'POST' })
  .inputValidator((input: { cid: string }) => input)
  .handler(async ({ data }) => {
    await requireAdmin()
    const db = getDb()
    const kv = getCache()
    const r2 = getBucket()

    const post = await getPostByCid(db, data.cid)
    if (!post) return

    const hashes = await deleteMediaRefsForPost(db, data.cid)
    const refCounts = await Promise.all(
      hashes.map((hash) =>
        getMediaRefCount(db, hash).then((count) => ({ hash, count })),
      ),
    )
    const orphaned = refCounts
      .filter((ref) => ref.count === 0)
      .map((ref) => ref.hash)
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
  await writePostIndex(kv, allPosts.map(toPostIndexEntry))
}

export const Route = createFileRoute('/@/_dashboard/contents/')({
  loader: async () => {
    const [posts, readCounts] = await Promise.all([
      listPosts(),
      getAllReadCounts(),
    ])
    return { posts, readCounts: readCounts.counts }
  },
  component: PostsList,
})

function PostsList() {
  const { posts, readCounts } = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()
  const { siteTimezone } = useRouteContext({ from: '__root__' })
  const [rebuildingCid, setRebuildingCid] = useState<string | null>(null)

  async function handleNewPost() {
    const { cid } = await createDraft()
    navigate({
      to: '/@/editor/$cid',
      params: { cid },
      search: { view: 'wysiwyg' },
    })
  }

  async function handleToggle(cid: string, current: number) {
    await togglePublished({ data: { cid, published: current === 0 } })
    router.invalidate()
  }

  async function handleDelete(cid: string) {
    if (!window.confirm('Delete this post? This cannot be undone.')) return
    await removePost({ data: { cid } })
    router.invalidate()
  }

  async function handleRebuild(cid: string) {
    setRebuildingCid(cid)
    try {
      await rebuildPostKv({ data: { cid } })
    } finally {
      setRebuildingCid(null)
    }
  }

  async function handleEditReads(cid: string, current: number) {
    const input = window.prompt('Set read count:', String(current))
    if (input == null) return
    const trimmed = input.trim()
    if (!trimmed) return
    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed) || parsed < 0) {
      window.alert('Must be a non-negative number.')
      return
    }
    await setReadCount({ data: { cid, reads: Math.floor(parsed) } })
    router.invalidate()
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[17px] font-[560] tracking-[-0.015em] text-primary">
          Posts
        </h1>
        <button
          type="button"
          onClick={handleNewPost}
          className="rounded-sm bg-primary px-3 py-1.5 text-[13px] font-[560] text-surface"
        >
          New Post
        </button>
      </div>

      {posts.length === 0 ? (
        <p className="text-[14px] text-primary opacity-(--opacity-muted)">
          No posts yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-border bg-raised">
                <th className="px-4 py-2.5 text-left text-[12px] font-[560] text-primary">
                  Title
                </th>
                <th className="px-4 py-2.5 text-left text-[12px] font-[560] text-primary">
                  Category
                </th>
                <th className="px-4 py-2.5 text-left text-[12px] font-[560] text-primary">
                  Status
                </th>
                <th className="px-4 py-2.5 text-left text-[12px] font-[560] text-primary">
                  Created
                </th>
                <th className="px-4 py-2.5 text-right text-[12px] font-[560] text-primary">
                  Reads
                </th>
                <th className="px-4 py-2.5 text-right text-[12px] font-[560] text-primary">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr
                  key={post.cid}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="text-[14px] font-[560] text-primary">
                      {post.title}
                    </div>
                    <div className="mt-0.5 text-[12px] text-primary opacity-(--opacity-faint)">
                      {post.slug}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-primary opacity-(--opacity-muted)">
                    {post.category ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggle(post.cid, post.published)}
                      className={`cursor-pointer text-[12px] text-primary transition-opacity duration-140 hover:opacity-100 ${
                        post.published === 1
                          ? 'opacity-(--opacity-soft)'
                          : 'opacity-(--opacity-faint)'
                      }`}
                    >
                      {post.published === 1 ? 'Published' : 'Draft'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-primary opacity-(--opacity-muted)">
                    {formatDateShort(post.createdAt, siteTimezone)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        handleEditReads(post.cid, readCounts[post.cid] ?? 0)
                      }
                      className="cursor-pointer text-[13px] text-primary tabular-nums opacity-(--opacity-muted) transition-opacity duration-140 hover:opacity-100"
                    >
                      {readCounts[post.cid] ?? 0}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        to="/@/editor/$cid"
                        params={{ cid: post.cid }}
                        search={{ view: 'wysiwyg' }}
                        className="text-[13px] text-primary opacity-(--opacity-muted) transition-opacity duration-140 hover:opacity-100"
                      >
                        Edit
                      </Link>
                      {post.published === 1 && (
                        <button
                          type="button"
                          disabled={rebuildingCid === post.cid}
                          onClick={() => handleRebuild(post.cid)}
                          className="cursor-pointer text-[13px] text-primary opacity-(--opacity-muted) transition-opacity duration-140 hover:opacity-100 disabled:cursor-wait disabled:opacity-(--opacity-faint)"
                        >
                          {rebuildingCid === post.cid
                            ? 'Rebuilding…'
                            : 'Rebuild'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(post.cid)}
                        className="text-[13px] text-primary opacity-(--opacity-muted) transition-opacity duration-140 hover:opacity-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
