/* src/routes/@/_dashboard/comments/index.tsx */

import { useState } from 'react'
import {
  createFileRoute,
  useRouteContext,
  useRouter,
} from '@tanstack/react-router'
import {
  fetchPendingComments,
  fetchAllComments,
  approveComment,
  rejectComment,
  removeComment,
} from '~/server/comments'
import { formatDateShort } from '~/lib/utils/date'

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

function CommentsPage() {
  const data = Route.useLoaderData()
  const { siteTimezone } = useRouteContext({ from: '__root__' })
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('pending')
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
    if (!window.confirm('Delete this comment? This cannot be undone.')) return
    setLoading(id)
    await removeComment({ data: { id } })
    setLoading(null)
    router.invalidate()
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[17px] font-[560] tracking-[-0.015em] text-primary">
          Comments
        </h1>
      </div>

      <div className="mb-6 flex gap-4 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setTab('pending')}
          className={`text-[13px] text-primary transition-opacity duration-140 ${
            tab === 'pending'
              ? 'font-[560] opacity-100'
              : 'opacity-(--opacity-muted) hover:opacity-100'
          }`}
        >
          Pending ({data.pending.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('all')}
          className={`text-[13px] text-primary transition-opacity duration-140 ${
            tab === 'all'
              ? 'font-[560] opacity-100'
              : 'opacity-(--opacity-muted) hover:opacity-100'
          }`}
        >
          All ({data.all.length})
        </button>
      </div>

      {comments.length === 0 ? (
        <p className="text-[14px] text-primary opacity-(--opacity-muted)">
          {tab === 'pending' ? 'No pending comments.' : 'No comments yet.'}
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-border bg-raised">
                <th className="px-4 py-2.5 text-left text-[12px] font-[560] text-primary">
                  Comment
                </th>
                <th className="px-4 py-2.5 text-left text-[12px] font-[560] text-primary">
                  Author
                </th>
                <th className="px-4 py-2.5 text-left text-[12px] font-[560] text-primary">
                  Post
                </th>
                {tab === 'all' && (
                  <th className="px-4 py-2.5 text-left text-[12px] font-[560] text-primary">
                    Status
                  </th>
                )}
                <th className="px-4 py-2.5 text-left text-[12px] font-[560] text-primary">
                  Date
                </th>
                <th className="px-4 py-2.5 text-right text-[12px] font-[560] text-primary">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {comments.map((comment) => (
                <tr
                  key={comment.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="max-w-64 px-4 py-3">
                    <div className="truncate text-[14px] text-primary">
                      {comment.content}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-primary opacity-(--opacity-muted)">
                    {comment.userName}
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-32 truncate text-[13px] text-primary opacity-(--opacity-muted)">
                      {comment.postTitle}
                    </div>
                  </td>
                  {tab === 'all' && (
                    <td className="px-4 py-3">
                      <span
                        className={`text-[12px] text-primary ${
                          comment.status === 'pending'
                            ? ''
                            : comment.status === 'approved'
                              ? 'opacity-(--opacity-muted)'
                              : 'line-through opacity-(--opacity-faint)'
                        }`}
                      >
                        {comment.status}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3 text-[13px] text-primary opacity-(--opacity-muted)">
                    {formatDateShort(comment.createdAt, siteTimezone)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {tab === 'pending' && (
                        <>
                          <button
                            type="button"
                            disabled={loading === comment.id}
                            onClick={() => handleApprove(comment.id)}
                            className="text-[13px] text-primary transition-opacity duration-140 hover:opacity-100 disabled:opacity-(--opacity-disabled)"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={loading === comment.id}
                            onClick={() => handleReject(comment.id)}
                            className="text-[13px] text-primary opacity-(--opacity-muted) transition-opacity duration-140 hover:opacity-100 disabled:opacity-(--opacity-disabled)"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        disabled={loading === comment.id}
                        onClick={() => handleDelete(comment.id)}
                        className="text-[13px] text-primary opacity-(--opacity-muted) transition-opacity duration-140 hover:opacity-100 disabled:opacity-(--opacity-disabled)"
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
