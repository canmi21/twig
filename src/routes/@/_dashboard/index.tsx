/* src/routes/@/_dashboard/index.tsx */

import { useState } from 'react'
import { createFileRoute, useRouteContext } from '@tanstack/react-router'
import {
  fetchDashboardOverview,
  resetPresenceSockets,
} from '~/server/dashboard'

export const Route = createFileRoute('/@/_dashboard/')({
  loader: () => fetchDashboardOverview(),
  component: OverviewPage,
})

function formatOverviewDate(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone,
  })
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="text-[24px] font-[620] text-primary">{value}</div>
      <div className="mt-1 text-[12px] text-primary opacity-(--opacity-muted)">
        {label}
      </div>
    </div>
  )
}

function OverviewPage() {
  const { postStats, commentStats, recentPosts, recentComments, userCount } =
    Route.useLoaderData()
  const { siteTimezone } = useRouteContext({ from: '__root__' })
  const [resetting, setResetting] = useState(false)
  const [resetResult, setResetResult] = useState<string | null>(null)

  async function handleResetPresence() {
    if (
      !window.confirm(
        'Force-close every live WebSocket? Visitors will reconnect within seconds.',
      )
    ) {
      return
    }
    setResetting(true)
    setResetResult(null)
    try {
      const { closed } = await resetPresenceSockets()
      setResetResult(`Closed ${closed} socket${closed === 1 ? '' : 's'}.`)
    } catch {
      setResetResult('Failed to reset presence.')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-[560] tracking-[-0.015em] text-primary">
          Overview
        </h1>
        <div className="flex items-center gap-3">
          {resetResult && (
            <span className="text-[12px] text-primary opacity-(--opacity-muted)">
              {resetResult}
            </span>
          )}
          <button
            type="button"
            disabled={resetting}
            onClick={handleResetPresence}
            className="cursor-pointer rounded-sm border border-border px-3 py-1 text-[12px] text-primary opacity-(--opacity-muted) transition-opacity duration-140 hover:opacity-100 disabled:cursor-wait disabled:opacity-(--opacity-faint)"
          >
            {resetting ? 'Resetting…' : 'Reset presence'}
          </button>
        </div>
      </div>

      <div className="mt-6 flex gap-8">
        <Stat value={postStats.total} label="Posts" />
        <Stat value={postStats.published} label="Published" />
        <Stat value={postStats.draft} label="Drafts" />
        <Stat value={commentStats.total} label="Comments" />
        <Stat value={commentStats.pending} label="Pending" />
        <Stat value={userCount} label="Users" />
      </div>

      <div className="mt-10 grid grid-cols-2 gap-8">
        <div>
          <h2 className="mb-3 text-[13px] font-[560] text-primary">
            Recent Posts
          </h2>
          {recentPosts.length === 0 ? (
            <p className="text-[13px] text-primary opacity-(--opacity-muted)">
              No posts yet.
            </p>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-raised">
                    <th className="px-3 py-2 text-left text-[12px] font-[560] text-primary">
                      Title
                    </th>
                    <th className="px-3 py-2 text-left text-[12px] font-[560] text-primary">
                      Status
                    </th>
                    <th className="px-3 py-2 text-right text-[12px] font-[560] text-primary">
                      Updated
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentPosts.map((post) => (
                    <tr
                      key={post.slug}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-3 py-2">
                        <span className="text-[13px] text-primary">
                          {post.title}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`text-[12px] text-primary ${post.published ? 'opacity-(--opacity-soft)' : 'opacity-(--opacity-faint)'}`}
                        >
                          {post.published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-[12px] text-primary opacity-(--opacity-muted)">
                        {formatOverviewDate(post.updatedAt, siteTimezone)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-[13px] font-[560] text-primary">
            Recent Comments
          </h2>
          {recentComments.length === 0 ? (
            <p className="text-[13px] text-primary opacity-(--opacity-muted)">
              No comments yet.
            </p>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-raised">
                    <th className="px-3 py-2 text-left text-[12px] font-[560] text-primary">
                      Comment
                    </th>
                    <th className="px-3 py-2 text-left text-[12px] font-[560] text-primary">
                      Author
                    </th>
                    <th className="px-3 py-2 text-right text-[12px] font-[560] text-primary">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentComments.map((comment) => (
                    <tr
                      key={comment.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="max-w-48 truncate px-3 py-2 text-[13px] text-primary">
                        {comment.content}
                      </td>
                      <td className="px-3 py-2 text-[12px] text-primary opacity-(--opacity-muted)">
                        {comment.userName}
                      </td>
                      <td
                        className={`px-3 py-2 text-right text-[12px] text-primary ${
                          comment.status === 'pending'
                            ? ''
                            : comment.status === 'approved'
                              ? 'opacity-(--opacity-muted)'
                              : 'line-through opacity-(--opacity-faint)'
                        }`}
                      >
                        {comment.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
