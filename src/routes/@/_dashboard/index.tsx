/* src/routes/@/_dashboard/index.tsx */

import { createFileRoute } from '@tanstack/react-router'
import { fetchDashboardOverview } from '~/server/dashboard'

export const Route = createFileRoute('/@/_dashboard/')({
  loader: () => fetchDashboardOverview(),
  component: OverviewPage,
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
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

  return (
    <div>
      <h1 className="text-[17px] font-[560] tracking-[-0.015em] text-primary">
        Overview
      </h1>

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
                        {formatDate(post.updatedAt)}
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
                  {recentComments.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="max-w-48 truncate px-3 py-2 text-[13px] text-primary">
                        {c.content}
                      </td>
                      <td className="px-3 py-2 text-[12px] text-primary opacity-(--opacity-muted)">
                        {c.userName}
                      </td>
                      <td
                        className={`px-3 py-2 text-right text-[12px] text-primary ${
                          c.status === 'pending'
                            ? ''
                            : c.status === 'approved'
                              ? 'opacity-(--opacity-muted)'
                              : 'line-through opacity-(--opacity-faint)'
                        }`}
                      >
                        {c.status}
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
