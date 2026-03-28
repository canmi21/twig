/* src/routes/@/_dashboard/comments/index.tsx */

import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'motion/react'
import {
  fetchPendingComments,
  fetchAllComments,
  approveComment,
  rejectComment,
  removeComment,
} from '~/server/comments'

type Tab = 'pending' | 'all'

interface CommentRow {
  id: string
  content: string
  status: string
  createdAt: string
  parentId: string | null
  userName: string
  userEmail: string
  postCid: string
  postTitle: string
  postSlug: string
}

const loadComments = async (): Promise<{
  pending: CommentRow[]
  all: CommentRow[]
}> => {
  const [pending, all] = await Promise.all([
    fetchPendingComments(),
    fetchAllComments(),
  ])
  return { pending, all }
}

export const Route = createFileRoute('/@/_dashboard/comments/')({
  loader: () => loadComments(),
  component: CommentsPage,
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-caution/10 text-caution',
    approved: 'bg-success/10 text-success',
    rejected: 'bg-danger/10 text-danger',
  }
  return (
    <span
      className={`rounded-sm px-2 py-0.5 text-xs ${styles[status] ?? 'bg-raised text-secondary'}`}
    >
      {status}
    </span>
  )
}

const tabs: { key: Tab; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'all', label: 'All' },
]

function CommentsPage() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('pending')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const comments = tab === 'pending' ? data.pending : data.all
  const commentById = new Map(data.all.map((c) => [c.id, c]))

  async function handleApprove(id: string) {
    setLoading(id)
    await approveComment({ data: { id } })
    setLoading(null)
    router.invalidate()
  }

  async function handleReject(id: string) {
    setLoading(id)
    await rejectComment({ data: { id } })
    setLoading(null)
    router.invalidate()
  }

  async function handleDelete(id: string) {
    setLoading(id)
    await removeComment({ data: { id } })
    setDeleting(null)
    setLoading(null)
    router.invalidate()
  }

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="mb-8"
      >
        <h1 className="text-[17px] font-medium">Comments</h1>
        <p className="mt-1 text-[13px] text-secondary">
          {data.all.length} total, {data.pending.length} pending
        </p>
      </motion.div>

      <div className="relative mb-4 flex gap-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`relative rounded-sm px-3 py-1 text-sm ${
              tab === t.key
                ? 'font-medium text-primary'
                : 'text-secondary hover:text-primary'
            }`}
          >
            {tab === t.key && (
              <motion.div
                layoutId="comment-tab-indicator"
                className="absolute inset-0 rounded-sm bg-raised"
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 28,
                }}
              />
            )}
            <span className="relative z-10">
              {t.label} (
              {t.key === 'pending' ? data.pending.length : data.all.length})
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {comments.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-[14px] text-secondary">
                {tab === 'pending'
                  ? 'No pending comments.'
                  : 'No comments yet.'}
              </p>
              <p className="mt-1 text-[12px] text-tertiary">
                {tab === 'pending'
                  ? 'All caught up.'
                  : 'Comments will appear here once readers engage.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-secondary">
                  <th className="pb-2 font-normal">Comment</th>
                  <th className="pb-2 font-normal">Author</th>
                  <th className="pb-2 font-normal">Post</th>
                  {tab === 'all' && (
                    <th className="pb-2 font-normal">Status</th>
                  )}
                  <th className="pb-2 font-normal">Date</th>
                  <th className="pb-2 text-right font-normal">Actions</th>
                </tr>
              </thead>
              <tbody>
                {comments.map((c, i) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.05 }}
                    className="border-b border-border transition-colors hover:bg-raised/50"
                  >
                    <td className="max-w-64 py-3">
                      {c.parentId && (
                        <span className="mb-0.5 block text-[11px] text-tertiary">
                          Reply to{' '}
                          {commentById.get(c.parentId)?.userName ?? 'deleted'}
                        </span>
                      )}
                      <div className="truncate text-[14px]">{c.content}</div>
                    </td>
                    <td className="py-3 text-[13px] text-secondary">
                      {c.userName}
                    </td>
                    <td className="py-3 text-[13px] text-secondary">
                      <div className="max-w-32 truncate">{c.postTitle}</div>
                    </td>
                    {tab === 'all' && (
                      <td className="py-3">
                        <StatusBadge status={c.status} />
                      </td>
                    )}
                    <td className="py-3 text-[13px] text-secondary">
                      {formatDate(c.createdAt)}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {tab === 'pending' && (
                          <>
                            <button
                              type="button"
                              disabled={loading === c.id}
                              onClick={() => handleApprove(c.id)}
                              className="text-success transition-colors hover:opacity-80 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={loading === c.id}
                              onClick={() => handleReject(c.id)}
                              className="text-secondary transition-colors hover:text-danger disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <AnimatePresence mode="wait">
                          {deleting === c.id ? (
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
                                disabled={loading === c.id}
                                onClick={() => handleDelete(c.id)}
                                className="text-danger disabled:opacity-50"
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
                              onClick={() => setDeleting(c.id)}
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
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
