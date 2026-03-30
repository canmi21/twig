/* src/routes/@/_dashboard/contents/index.tsx */

import { useState } from 'react'
import {
  createFileRoute,
  Link,
  useRouter,
  useNavigate,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
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

/* ── Server functions ─────────────────────────── */

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

/* ── Route ────────────────────────────────────── */

export const Route = createFileRoute('/@/_dashboard/contents/')({
  loader: () => listPosts(),
  component: PostsPage,
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/* ── Component ────────────────────────────────── */

function PostsPage() {
  const posts = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()
  const [busy, setBusy] = useState<string | null>(null)

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
    setBusy(cid)
    await togglePublished({ data: { cid, published: current === 0 } })
    setBusy(null)
    router.invalidate()
  }

  async function handleDelete(cid: string) {
    setBusy(cid)
    await removePost({ data: { cid } })
    setBusy(null)
    router.invalidate()
  }

  const published = posts.filter((p) => p.published === 1).length
  const draft = posts.length - published

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-geist-1000">Posts</h1>
          <p className="mt-0.5 text-[12px] text-geist-600">
            {posts.length} total &middot; {published} published &middot; {draft}{' '}
            draft
          </p>
        </div>
        <button
          type="button"
          onClick={handleNewPost}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-geist-1000 px-3 text-[13px] font-medium text-geist-bg transition-opacity hover:opacity-90"
        >
          <Plus size={14} strokeWidth={2} />
          New Post
        </button>
      </div>

      {/* Table */}
      {posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-geist-400 py-16 text-center">
          <p className="text-[13px] font-medium text-geist-900">No posts yet</p>
          <p className="mt-1 text-[12px] text-geist-600">
            Create your first post to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-geist-bg-2 shadow-geist-border">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-geist-200 bg-geist-100 text-left">
                <th className="px-3 py-2 text-[11px] font-medium tracking-wider text-geist-600 uppercase">
                  Title
                </th>
                <th className="px-3 py-2 text-[11px] font-medium tracking-wider text-geist-600 uppercase">
                  Category
                </th>
                <th className="px-3 py-2 text-[11px] font-medium tracking-wider text-geist-600 uppercase">
                  Status
                </th>
                <th className="px-3 py-2 text-[11px] font-medium tracking-wider text-geist-600 uppercase">
                  Date
                </th>
                <th className="w-20 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => {
                const isBusy = busy === post.cid
                return (
                  <tr
                    key={post.cid}
                    className={`border-b border-geist-200 transition-colors last:border-0 hover:bg-geist-100/50 ${isBusy ? 'opacity-50' : ''}`}
                  >
                    <td className="px-3 py-2.5">
                      <Link
                        to="/@/editor/$cid"
                        params={{ cid: post.cid }}
                        search={{
                          preview: 'rendered',
                          pretty: undefined,
                          format: true,
                          highlight: true,
                        }}
                        className="group"
                      >
                        <div className="font-medium text-geist-1000 group-hover:underline">
                          {post.title}
                        </div>
                        <div className="geist-mono mt-0.5 text-[11px] text-geist-600">
                          /{post.slug}
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-geist-900">
                      {post.category ?? (
                        <span className="text-geist-500">--</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => handleToggle(post.cid, post.published)}
                        disabled={isBusy}
                        className="cursor-pointer disabled:cursor-wait"
                      >
                        <span
                          className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-medium ${post.published === 1 ? 'bg-geist-success-light text-geist-success-dark' : 'bg-geist-100 text-geist-600'}`}
                        >
                          {isBusy && (
                            <Loader2 size={10} className="animate-spin" />
                          )}
                          {post.published === 1 ? 'Published' : 'Draft'}
                        </span>
                      </button>
                    </td>
                    <td className="geist-mono px-3 py-2.5 text-[12px] whitespace-nowrap text-geist-600 tabular-nums">
                      {formatDate(post.createdAt)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Link
                          to="/@/editor/$cid"
                          params={{ cid: post.cid }}
                          search={{
                            preview: 'rendered',
                            pretty: undefined,
                            format: true,
                            highlight: true,
                          }}
                          className="inline-flex size-7 items-center justify-center rounded-md text-geist-600 transition-colors hover:bg-geist-100 hover:text-geist-1000"
                          title="Edit"
                        >
                          <Pencil size={14} strokeWidth={1.5} />
                        </Link>
                        <DeletePostDialog
                          title={post.title}
                          onConfirm={() => handleDelete(post.cid)}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── Delete dialog ────────────────────────────── */

function DeletePostDialog({
  title,
  onConfirm,
}: {
  title: string
  onConfirm: () => void
}) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex size-7 items-center justify-center rounded-md text-geist-600 transition-colors hover:bg-geist-error-light hover:text-geist-error"
          title="Delete"
        >
          <Trash2 size={14} strokeWidth={1.5} />
        </button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-1/2 rounded-lg bg-geist-bg p-6 shadow-geist-md">
          <AlertDialog.Title className="text-[15px] font-semibold text-geist-1000">
            Delete post
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-[13px] leading-relaxed text-geist-900">
            Permanently delete &ldquo;{title}&rdquo; and all associated media?
            This cannot be undone.
          </AlertDialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Cancel className="h-8 rounded-md border border-geist-400 bg-geist-bg px-3 text-[13px] font-medium text-geist-1000 transition-colors hover:bg-geist-100">
              Cancel
            </AlertDialog.Cancel>
            <AlertDialog.Action
              onClick={onConfirm}
              className="h-8 rounded-md bg-geist-error px-3 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
            >
              Delete
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
