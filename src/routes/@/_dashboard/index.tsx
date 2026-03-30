/* src/routes/@/_dashboard/index.tsx */

import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import {
  FileText,
  Eye,
  MessageSquare,
  Users,
  Plus,
  ArrowRight,
} from 'lucide-react'
import { fetchDashboardOverview } from '~/server/dashboard'
import { getDb } from '~/server/platform'
import { upsertPost } from '~/lib/database/posts'
import { newCid } from '~/lib/utils/uuid'
import { computeContentHash } from '~/lib/utils/hash'

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

export const Route = createFileRoute('/@/_dashboard/')({
  loader: () => fetchDashboardOverview(),
  component: DashboardOverviewPage,
})

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

const statConfig = [
  { key: 'total', label: 'Total Posts', icon: FileText },
  { key: 'published', label: 'Published', icon: Eye },
  { key: 'pending', label: 'Pending', icon: MessageSquare },
  { key: 'users', label: 'Users', icon: Users },
] as const

function DashboardOverviewPage() {
  const overview = Route.useLoaderData()
  const navigate = useNavigate()

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

  const statValues: Record<string, { value: number; sub?: string }> = {
    total: {
      value: overview.postStats.total,
      sub: `${overview.postStats.published} published, ${overview.postStats.draft} draft`,
    },
    published: { value: overview.postStats.published },
    pending: {
      value: overview.commentStats.pending,
      sub: `${overview.commentStats.total} total`,
    },
    users: { value: overview.userCount },
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
            Overview
          </h1>
          <p className="text-[13px] text-secondary">
            Manage your content and interactions.
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

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statConfig.map(({ key, label, icon: Icon }) => {
          const { value, sub } = statValues[key]
          const isWarning = key === 'pending' && value > 0
          return (
            <div
              key={key}
              className="group relative overflow-hidden rounded-2xl bg-subtle/40 p-5 ring-1 ring-boundary/50 transition-all hover:bg-subtle/60 hover:ring-boundary"
            >
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-tint p-2 text-secondary group-hover:text-foreground">
                  <Icon size={18} strokeWidth={1.5} />
                </div>
              </div>
              <div className="mt-4">
                <div
                  className={`text-2xl font-semibold tracking-tight ${isWarning ? 'text-danger' : 'text-foreground'}`}
                >
                  {value}
                </div>
                <div className="text-[12px] font-medium text-secondary uppercase tracking-wider">
                  {label}
                </div>
              </div>
              {sub && (
                <div className="mt-2 text-[11px] text-dim line-clamp-1">
                  {sub}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent posts */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[14px] font-semibold text-foreground">
              Recent Posts
            </h2>
            <Link
              to="/@/contents"
              className="group flex items-center gap-1 text-[12px] text-secondary hover:text-theme"
            >
              View all
              <ArrowRight
                size={12}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl bg-subtle/40 ring-1 ring-boundary/50">
            {overview.recentPosts.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-dim">
                No posts yet.
              </div>
            ) : (
              <div className="divide-y divide-boundary/30">
                {overview.recentPosts.map((post) => (
                  <Link
                    key={post.cid}
                    to="/@/editor/$cid"
                    params={{ cid: post.cid }}
                    search={{
                      preview: 'rendered',
                      pretty: undefined,
                      format: true,
                      highlight: true,
                    }}
                    className="flex items-center justify-between p-4 transition-colors hover:bg-tint/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-foreground">
                        {post.title}
                      </div>
                      <div className="mt-0.5 text-[11px] text-dim">
                        {timeAgo(post.updatedAt)}
                      </div>
                    </div>
                    <div className="ml-4 shrink-0">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          post.published === 1
                            ? 'bg-success-subtle text-success-text'
                            : 'bg-muted text-secondary'
                        }`}
                      >
                        {post.published === 1 ? 'Live' : 'Draft'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Recent comments */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[14px] font-semibold text-foreground">
              Recent Comments
            </h2>
            <Link
              to="/@/comments"
              className="group flex items-center gap-1 text-[12px] text-secondary hover:text-theme"
            >
              View all
              <ArrowRight
                size={12}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl bg-subtle/40 ring-1 ring-boundary/50">
            {overview.recentComments.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-dim">
                No comments yet.
              </div>
            ) : (
              <div className="divide-y divide-boundary/30">
                {overview.recentComments.map((c) => (
                  <div key={c.id} className="p-4">
                    <div className="line-clamp-1 text-[13px] text-foreground">
                      {c.content}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-dim">
                      <span className="font-semibold text-secondary">
                        {c.userName}
                      </span>
                      <span>•</span>
                      <span className="truncate">{c.postTitle}</span>
                      <span className="ml-auto shrink-0">
                        {timeAgo(c.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Pending alert */}
      {overview.commentStats.pending > 0 && (
        <div className="flex items-center justify-between rounded-2xl bg-theme-subtle p-4 ring-1 ring-theme/20">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-theme/10 p-2 text-theme-text">
              <MessageSquare size={18} />
            </div>
            <span className="text-[13px] text-theme-text font-medium">
              You have {overview.commentStats.pending} comment
              {overview.commentStats.pending > 1 ? 's' : ''} awaiting review.
            </span>
          </div>
          <Link
            to="/@/comments"
            className="rounded-full bg-theme px-4 py-1.5 text-[12px] font-bold text-surface transition-opacity hover:opacity-90"
          >
            Review Now
          </Link>
        </div>
      )}
    </div>
  )
}
