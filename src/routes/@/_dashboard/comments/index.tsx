/* src/routes/@/_dashboard/comments/index.tsx */

import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Check, X, Trash2, Loader2 } from 'lucide-react'
import * as Tabs from '@radix-ui/react-tabs'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import {
  fetchPendingComments,
  fetchAllComments,
  approveComment,
  rejectComment,
  removeComment,
} from '~/server/comments'

/* ── Types ────────────────────────────────────── */

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

/* ── Route ────────────────────────────────────── */

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

/* ── Helpers ──────────────────────────────────── */

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const statusStyle: Record<string, string> = {
  pending: 'bg-geist-warning-light text-geist-warning-dark',
  approved: 'bg-geist-success-light text-geist-success-dark',
  rejected: 'bg-geist-error-light text-geist-error-dark',
}

/* ── Delete dialog ────────────────────────────── */

function DeleteCommentDialog({
  userName,
  onConfirm,
}: {
  userName: string
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
            Delete comment
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-[13px] leading-relaxed text-geist-900">
            Permanently delete this comment by {userName}? Any replies will also
            be removed.
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

/* ── Comment table ────────────────────────────── */

interface CommentTableProps {
  comments: CommentRow[]
  commentById: Map<string, CommentRow>
  showStatus: boolean
  showModActions: boolean
  busy: string | null
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onDelete: (id: string) => void
}

function CommentTable({
  comments,
  commentById,
  showStatus,
  showModActions,
  busy,
  onApprove,
  onReject,
  onDelete,
}: CommentTableProps) {
  if (comments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-geist-400 py-14 text-center">
        <p className="text-[13px] font-medium text-geist-900">
          {showModActions ? 'No pending comments' : 'No comments yet'}
        </p>
        <p className="mt-1 text-[12px] text-geist-600">
          {showModActions
            ? 'All caught up.'
            : 'Comments will appear once readers engage.'}
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg bg-geist-bg-2 shadow-geist-border">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-geist-200 bg-geist-100 text-left">
            <th className="w-[35%] px-3 py-2 text-[11px] font-medium tracking-wider text-geist-600 uppercase">
              Comment
            </th>
            <th className="px-3 py-2 text-[11px] font-medium tracking-wider text-geist-600 uppercase">
              Author
            </th>
            <th className="px-3 py-2 text-[11px] font-medium tracking-wider text-geist-600 uppercase">
              Post
            </th>
            {showStatus && (
              <th className="px-3 py-2 text-[11px] font-medium tracking-wider text-geist-600 uppercase">
                Status
              </th>
            )}
            <th className="px-3 py-2 text-[11px] font-medium tracking-wider text-geist-600 uppercase">
              Date
            </th>
            <th className="w-24 px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {comments.map((c) => {
            const isBusy = busy === c.id
            return (
              <tr
                key={c.id}
                className={`border-b border-geist-200 transition-colors last:border-0 hover:bg-geist-100/50 ${isBusy ? 'opacity-50' : ''}`}
              >
                <td className="px-3 py-2.5">
                  {c.parentId && (
                    <div className="mb-0.5 text-[11px] text-geist-600">
                      Reply to{' '}
                      {commentById.get(c.parentId)?.userName ?? 'deleted'}
                    </div>
                  )}
                  <div className="line-clamp-2 text-geist-1000">
                    {c.content}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="font-medium text-geist-1000">
                    {c.userName}
                  </div>
                  <div className="text-[11px] text-geist-600">
                    {c.userEmail}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="max-w-28 truncate text-geist-900">
                    {c.postTitle}
                  </div>
                </td>
                {showStatus && (
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-sm px-1.5 py-0.5 text-[11px] font-medium ${statusStyle[c.status] ?? 'bg-geist-100 text-geist-600'}`}
                    >
                      {c.status}
                    </span>
                  </td>
                )}
                <td className="geist-mono px-3 py-2.5 text-[12px] whitespace-nowrap text-geist-600 tabular-nums">
                  {formatDate(c.createdAt)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-0.5">
                    {showModActions && (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => onApprove(c.id)}
                          className="inline-flex size-7 items-center justify-center rounded-md text-geist-600 transition-colors hover:bg-geist-success-light hover:text-geist-success disabled:opacity-40"
                          title="Approve"
                        >
                          {isBusy ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Check size={14} strokeWidth={2} />
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => onReject(c.id)}
                          className="inline-flex size-7 items-center justify-center rounded-md text-geist-600 transition-colors hover:bg-geist-warning-light hover:text-geist-warning disabled:opacity-40"
                          title="Reject"
                        >
                          <X size={14} strokeWidth={2} />
                        </button>
                      </>
                    )}
                    <DeleteCommentDialog
                      userName={c.userName}
                      onConfirm={() => onDelete(c.id)}
                    />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ── Page component ───────────────────────────── */

function CommentsPage() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  const commentById = new Map(data.all.map((c) => [c.id, c]))

  async function handleApprove(id: string) {
    setBusy(id)
    await approveComment({ data: { id } })
    setBusy(null)
    router.invalidate()
  }

  async function handleReject(id: string) {
    setBusy(id)
    await rejectComment({ data: { id } })
    setBusy(null)
    router.invalidate()
  }

  async function handleDelete(id: string) {
    setBusy(id)
    await removeComment({ data: { id } })
    setBusy(null)
    router.invalidate()
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[15px] font-semibold text-geist-1000">Comments</h1>
        <p className="mt-0.5 text-[12px] text-geist-600">
          {data.all.length} total &middot; {data.pending.length} pending review
        </p>
      </div>

      <Tabs.Root defaultValue="pending">
        <Tabs.List className="flex border-b border-geist-200">
          <Tabs.Trigger
            value="pending"
            className="relative px-3 py-2 text-[13px] text-geist-600 transition-colors data-[state=active]:font-medium data-[state=active]:text-geist-1000 data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:bottom-0 data-[state=active]:after:h-px data-[state=active]:after:bg-geist-1000"
          >
            Pending
            {data.pending.length > 0 && (
              <span className="ml-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-geist-error px-1 text-[10px] leading-none font-semibold text-white">
                {data.pending.length}
              </span>
            )}
          </Tabs.Trigger>
          <Tabs.Trigger
            value="all"
            className="relative px-3 py-2 text-[13px] text-geist-600 transition-colors data-[state=active]:font-medium data-[state=active]:text-geist-1000 data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:bottom-0 data-[state=active]:after:h-px data-[state=active]:after:bg-geist-1000"
          >
            All ({data.all.length})
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="pending" className="mt-4">
          <CommentTable
            comments={data.pending}
            commentById={commentById}
            showStatus={false}
            showModActions={true}
            busy={busy}
            onApprove={handleApprove}
            onReject={handleReject}
            onDelete={handleDelete}
          />
        </Tabs.Content>
        <Tabs.Content value="all" className="mt-4">
          <CommentTable
            comments={data.all}
            commentById={commentById}
            showStatus={true}
            showModActions={false}
            busy={busy}
            onApprove={handleApprove}
            onReject={handleReject}
            onDelete={handleDelete}
          />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}
