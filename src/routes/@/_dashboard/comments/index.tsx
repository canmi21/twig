/* src/routes/@/_dashboard/comments/index.tsx */

import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
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

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    pending:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    approved:
      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  return (
    <span
      className={`rounded-sm px-2 py-0.5 text-xs ${styles[status] ?? 'bg-raised text-secondary'}`}
    >
      {status}
    </span>
  )
}

function CommentsPage() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('pending')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const comments = tab === 'pending' ? data.pending : data.all

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
      <div className="mb-6">
        <h1 className="text-lg font-medium">Comments</h1>
      </div>

      <div className="mb-4 flex gap-1">
        <button
          type="button"
          onClick={() => setTab('pending')}
          className={`rounded-sm px-3 py-1 text-sm ${
            tab === 'pending'
              ? 'bg-raised font-medium text-primary'
              : 'text-secondary hover:text-primary'
          }`}
        >
          Pending ({data.pending.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('all')}
          className={`rounded-sm px-3 py-1 text-sm ${
            tab === 'all'
              ? 'bg-raised font-medium text-primary'
              : 'text-secondary hover:text-primary'
          }`}
        >
          All ({data.all.length})
        </button>
      </div>

      {comments.length === 0 ? (
        <p className="text-sm text-secondary">
          {tab === 'pending' ? 'No pending comments.' : 'No comments yet.'}
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-secondary">
              <th className="pb-2 font-normal">Comment</th>
              <th className="pb-2 font-normal">Author</th>
              <th className="pb-2 font-normal">Post</th>
              {tab === 'all' && <th className="pb-2 font-normal">Status</th>}
              <th className="pb-2 font-normal">Date</th>
              <th className="pb-2 text-right font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {comments.map((c) => (
              <tr key={c.id} className="border-b border-border">
                <td className="max-w-64 py-3">
                  <div className="truncate">{c.content}</div>
                </td>
                <td className="py-3 text-secondary">{c.userName}</td>
                <td className="py-3 text-secondary">
                  <div className="max-w-32 truncate">{c.postTitle}</div>
                </td>
                {tab === 'all' && (
                  <td className="py-3">{statusBadge(c.status)}</td>
                )}
                <td className="py-3 text-secondary">
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
                          className="text-green-600 hover:text-green-700 disabled:opacity-50 dark:text-green-400"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={loading === c.id}
                          onClick={() => handleReject(c.id)}
                          className="text-secondary hover:text-red-500 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {deleting === c.id ? (
                      <span className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={loading === c.id}
                          onClick={() => handleDelete(c.id)}
                          className="text-red-500 disabled:opacity-50"
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
                        onClick={() => setDeleting(c.id)}
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
