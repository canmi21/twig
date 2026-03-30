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
  const data = Route.useLoaderData()
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
      value: data.postStats.total,
      sub: `${data.postStats.published} published, ${data.postStats.draft} draft`,
    },
    published: { value: data.postStats.published },
    pending: {
      value: data.commentStats.pending,
      sub: `${data.commentStats.total} total`,
    },
    users: { value: data.userCount },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[15px] font-semibold text-geist-1000">Overview</h1>
        <button
          type="button"
          onClick={handleNewPost}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-geist-1000 px-3 text-[13px] font-medium text-geist-bg transition-opacity hover:opacity-90"
        >
          <Plus size={14} strokeWidth={2} />
          New Post
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statConfig.map(({ key, label, icon: Icon }) => {
          const { value, sub } = statValues[key]
          const highlight = key === 'pending' && value > 0
          return (
            <div
              key={key}
              className="rounded-lg bg-geist-bg-2 p-4 shadow-geist-border"
            >
              <div className="flex items-center gap-1.5 text-geist-600">
                <Icon size={13} strokeWidth={1.5} />
                <span className="text-[11px] font-medium tracking-wider uppercase">
                  {label}
                </span>
              </div>
              <div
                className={`geist-mono mt-2 text-[22px] font-semibold tabular-nums ${highlight ? 'text-geist-error' : 'text-geist-1000'}`}
              >
                {value}
              </div>
              {sub && (
                <div className="mt-0.5 text-[11px] text-geist-600">{sub}</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent posts */}
        <div className="overflow-hidden rounded-lg bg-geist-bg-2 shadow-geist-border">
          <div className="flex items-center justify-between border-b border-geist-200 px-4 py-2.5">
            <span className="text-[12px] font-medium tracking-wider text-geist-600 uppercase">
              Recent Posts
            </span>
            <Link
              to="/@/contents"
              className="flex items-center gap-0.5 text-[11px] text-geist-600 transition-colors hover:text-geist-1000"
            >
              View all <ArrowRight size={11} />
            </Link>
          </div>
          {data.recentPosts.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12px] text-geist-600">
              No posts yet.
            </div>
          ) : (
            <ul className="divide-y divide-geist-200">
              {data.recentPosts.map((post) => (
                <li key={post.cid}>
                  <Link
                    to="/@/editor/$cid"
                    params={{ cid: post.cid }}
                    search={{
                      preview: 'rendered',
                      pretty: undefined,
                      format: true,
                      highlight: true,
                    }}
                    className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-geist-100/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-geist-1000">
                        {post.title}
                      </div>
                      <div className="geist-mono mt-0.5 text-[11px] text-geist-600">
                        {timeAgo(post.updatedAt)}
                      </div>
                    </div>
                    <span
                      className={`ml-3 shrink-0 rounded-sm px-1.5 py-0.5 text-[11px] font-medium ${post.published === 1 ? 'bg-geist-success-light text-geist-success-dark' : 'bg-geist-100 text-geist-600'}`}
                    >
                      {post.published === 1 ? 'published' : 'draft'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent comments */}
        <div className="overflow-hidden rounded-lg bg-geist-bg-2 shadow-geist-border">
          <div className="flex items-center justify-between border-b border-geist-200 px-4 py-2.5">
            <span className="text-[12px] font-medium tracking-wider text-geist-600 uppercase">
              Recent Comments
            </span>
            <Link
              to="/@/comments"
              className="flex items-center gap-0.5 text-[11px] text-geist-600 transition-colors hover:text-geist-1000"
            >
              View all <ArrowRight size={11} />
            </Link>
          </div>
          {data.recentComments.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12px] text-geist-600">
              No comments yet.
            </div>
          ) : (
            <ul className="divide-y divide-geist-200">
              {data.recentComments.map((c) => (
                <li key={c.id} className="px-4 py-2.5">
                  <div className="truncate text-[13px] text-geist-1000">
                    {c.content}
                  </div>
                  <div className="mt-0.5 text-[11px] text-geist-600">
                    <span className="font-medium text-geist-900">
                      {c.userName}
                    </span>
                    {' on '}
                    <span className="text-geist-900">{c.postTitle}</span>
                    <span className="geist-mono ml-1.5">
                      {timeAgo(c.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Pending alert */}
      {data.commentStats.pending > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-geist-warning-light px-4 py-2.5 shadow-geist-border">
          <span className="text-[13px] text-geist-warning-dark">
            <span className="font-semibold">{data.commentStats.pending}</span>{' '}
            comment{data.commentStats.pending > 1 ? 's' : ''} awaiting review
          </span>
          <Link
            to="/@/comments"
            className="rounded-md border border-geist-400 bg-geist-bg px-3 py-1 text-[12px] font-medium text-geist-1000 transition-colors hover:bg-geist-100"
          >
            Review
          </Link>
        </div>
      )}
    </div>
  )
}
