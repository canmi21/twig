/* src/routes/@/_dashboard/contents/index.tsx */

import { useState } from 'react'
import {
  createFileRoute,
  Link,
  useRouter,
  useNavigate,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  FileText,
  Globe,
  Lock,
} from 'lucide-react'
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
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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

  const publishedCount = posts.filter((p) => p.published === 1).length
  const draftCount = posts.length - publishedCount

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
            Posts
          </h1>
          <p className="text-[13px] text-secondary">
            {posts.length} stories &middot; {publishedCount} live &middot;{' '}
            {draftCount} drafts
          </p>
        </div>
        <button
          type="button"
          onClick={handleNewPost}
          className="inline-flex h-9 items-center gap-2 rounded-full bg-foreground px-4 text-[13px] font-medium text-surface transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={16} strokeWidth={2.5} />
          New Post
        </button>
      </div>

      {/* List */}
      {posts.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-boundary/40 py-20 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-subtle text-dim">
            <FileText size={24} strokeWidth={1.5} />
          </div>
          <p className="mt-4 text-[14px] font-medium text-secondary">
            No posts found
          </p>
          <button
            type="button"
            onClick={handleNewPost}
            className="mt-2 text-[13px] text-theme font-medium hover:underline"
          >
            Create your first story
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-subtle/40 ring-1 ring-boundary/50">
          <div className="divide-y divide-boundary/30">
            {posts.map((post) => {
              const isBusy = busy === post.cid
              const isPublished = post.published === 1
              return (
                <div
                  key={post.cid}
                  className={`group relative flex items-center justify-between p-5 transition-all hover:bg-tint/40 ${isBusy ? 'opacity-50' : ''}`}
                >
                  <div className="min-w-0 flex-1 pr-8">
                    <div className="flex items-center gap-3">
                      <Link
                        to="/@/editor/$cid"
                        params={{ cid: post.cid }}
                        className="truncate text-[15px] font-semibold text-foreground decoration-boundary/50 underline-offset-[3px] group-hover:underline"
                      >
                        {post.title}
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleToggle(post.cid, post.published)}
                        disabled={isBusy}
                        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                          isPublished
                            ? 'bg-success-subtle text-success-text hover:bg-success/20'
                            : 'bg-muted text-secondary hover:bg-boundary/50'
                        }`}
                        title={isPublished ? 'Unpublish' : 'Publish'}
                      >
                        {isBusy ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : isPublished ? (
                          <Globe size={10} />
                        ) : (
                          <Lock size={10} />
                        )}
                        {isPublished ? 'Live' : 'Draft'}
                      </button>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[12px] text-dim">
                      <span className="font-medium text-secondary">
                        {post.category || 'Uncategorized'}
                      </span>
                      <span>&middot;</span>
                      <span className="truncate">/{post.slug}</span>
                      <span>&middot;</span>
                      <time className="shrink-0">
                        {formatDate(post.createdAt)}
                      </time>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Link
                      to="/@/editor/$cid"
                      params={{ cid: post.cid }}
                      search={{
                        preview: 'rendered',
                        pretty: undefined,
                        format: true,
                        highlight: true,
                      }}
                      className="inline-flex size-9 items-center justify-center rounded-full text-secondary transition-colors hover:bg-tint hover:text-foreground"
                      title="Edit Story"
                    >
                      <Pencil size={16} strokeWidth={1.8} />
                    </Link>
                    <DeletePostDialog
                      title={post.title}
                      onConfirm={() => handleDelete(post.cid)}
                    />
                  </div>
                </div>
              )
            })}
          </div>
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
          className="inline-flex size-9 items-center justify-center rounded-full text-secondary transition-colors hover:bg-danger-subtle hover:text-danger"
          title="Delete Story"
        >
          <Trash2 size={16} strokeWidth={1.8} />
        </button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-base/80 backdrop-blur-sm animate-in fade-in duration-200" />
        <AlertDialog.Content className="noise-bg fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-1/2 rounded-3xl bg-surface p-8 shadow-2xl ring-1 ring-boundary/50 animate-in zoom-in-95 fade-in duration-200">
          <AlertDialog.Title className="text-[18px] font-semibold tracking-tight text-foreground">
            Delete story?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-3 text-[14px] leading-relaxed text-secondary">
            You are about to permanently delete{' '}
            <span className="font-semibold text-foreground">
              &ldquo;{title}&rdquo;
            </span>
            . All associated images and data will be lost. This action cannot be
            undone.
          </AlertDialog.Description>
          <div className="mt-8 flex justify-end gap-3">
            <AlertDialog.Cancel className="h-10 rounded-full bg-tint px-5 text-[13px] font-semibold text-foreground transition-colors hover:bg-boundary/50">
              Go back
            </AlertDialog.Cancel>
            <AlertDialog.Action
              onClick={onConfirm}
              className="h-10 rounded-full bg-danger px-5 text-[13px] font-semibold text-surface transition-opacity hover:opacity-90"
            >
              Delete forever
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
