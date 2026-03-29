/* src/routes/@/_dashboard/index.tsx */

import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { motion } from 'motion/react'
import { Plus, MessageSquare } from 'lucide-react'
import {
  fetchDashboardOverview,
  type DashboardOverview,
} from '~/server/dashboard'
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
  component: DashboardOverview,
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

interface StatCardProps {
  label: string
  value: number
  secondary?: string
  highlight?: boolean
  index: number
}

function StatCard({
  label,
  value,
  secondary,
  highlight,
  index,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className="rounded-lg border border-boundary p-5"
    >
      <div className="text-[13px] text-secondary">{label}</div>
      <div
        className={`mt-1 text-2xl font-medium ${highlight ? 'text-caution' : 'text-foreground'}`}
      >
        {value}
      </div>
      {secondary && (
        <div className="mt-1 text-[12px] text-dim">{secondary}</div>
      )}
    </motion.div>
  )
}

function DashboardOverview() {
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

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="mb-8"
      >
        <h1 className="text-[17px] font-medium">Overview</h1>
      </motion.div>

      {/* Stats cards */}
      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Posts"
          value={data.postStats.total}
          secondary={`${data.postStats.published} published, ${data.postStats.draft} draft`}
          index={0}
        />
        <StatCard
          label="Published"
          value={data.postStats.published}
          index={1}
        />
        <StatCard
          label="Pending Comments"
          value={data.commentStats.pending}
          highlight={data.commentStats.pending > 0}
          secondary={`${data.commentStats.total} total`}
          index={2}
        />
        <StatCard label="Users" value={data.userCount} index={3} />
      </div>

      {/* Recent activity */}
      <div className="mb-10 grid gap-8 lg:grid-cols-2">
        {/* Recent posts */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.2 }}
        >
          <h2 className="text-[15px] font-medium">Recent Posts</h2>
          {data.recentPosts.length === 0 ? (
            <p className="mt-4 text-[13px] text-secondary">No posts yet.</p>
          ) : (
            <div className="mt-4 space-y-1">
              {data.recentPosts.map((post, i) => (
                <motion.div
                  key={post.cid}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: 0.25 + i * 0.04 }}
                >
                  <Link
                    to="/@/editor/$cid"
                    params={{ cid: post.cid }}
                    search={{
                      preview: 'rendered',
                      pretty: undefined,
                      format: true,
                      highlight: true,
                    }}
                    className="group flex items-center justify-between rounded-sm px-3 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-medium text-foreground">
                        {post.title}
                      </div>
                      <div className="mt-0.5 text-[12px] text-dim">
                        {timeAgo(post.updatedAt)}
                        {' — '}
                        <span
                          className={
                            post.published === 1
                              ? 'text-success'
                              : 'text-secondary'
                          }
                        >
                          {post.published === 1 ? 'published' : 'draft'}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent comments */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.2 }}
        >
          <h2 className="text-[15px] font-medium">Recent Comments</h2>
          {data.recentComments.length === 0 ? (
            <p className="mt-4 text-[13px] text-secondary">No comments yet.</p>
          ) : (
            <div className="mt-4 space-y-1">
              {data.recentComments.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: 0.25 + i * 0.04 }}
                  className="rounded-sm px-3 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <div className="truncate text-[14px] text-foreground">
                    {c.content}
                  </div>
                  <div className="mt-0.5 text-[12px] text-dim">
                    {c.userName} on{' '}
                    <span className="text-secondary">{c.postTitle}</span>
                    {' — '}
                    {timeAgo(c.createdAt)}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.3 }}
        className="flex flex-wrap gap-3"
      >
        <button
          type="button"
          onClick={handleNewPost}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 text-[13px] font-medium text-surface transition-opacity hover:opacity-90"
        >
          <Plus size={14} strokeWidth={2} />
          New Post
        </button>
        {data.commentStats.pending > 0 && (
          <Link
            to="/@/comments"
            className="inline-flex items-center gap-1.5 rounded-full border border-caution/30 bg-caution-subtle px-4 py-1.5 text-[13px] font-medium text-caution transition-colors hover:bg-caution-subtle"
          >
            <MessageSquare size={14} strokeWidth={1.7} />
            {data.commentStats.pending} pending
          </Link>
        )}
      </motion.div>
    </div>
  )
}
