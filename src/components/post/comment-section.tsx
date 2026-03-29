/* src/components/post/comment-section.tsx */

import { useState, useEffect, useCallback } from 'react'
import { Link } from '@tanstack/react-router'
import { CornerDownLeft } from 'lucide-react'
import { getSession } from '~/server/session'
import { fetchComments, submitComment } from '~/server/comments'

// -- Helpers ------------------------------------------------------------------

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function hashToHue(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

// -- Types --------------------------------------------------------------------

interface Comment {
  id: string
  content: string
  createdAt: string
  parentId: string | null
  userName: string
  userEmail: string
}

// -- Components ---------------------------------------------------------------

function CommentInput() {
  const [value, setValue] = useState('')
  const showSend = value.trim().length >= 3

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Write a comment..."
        rows={6}
        className="w-full resize-none rounded-xl border border-boundary bg-muted px-4 py-3 text-[14px] text-foreground outline-none placeholder:text-dim focus:border-dim/50"
      />
      <span className="absolute bottom-4 left-4 text-[11px] text-dim">
        Markdown &amp; GFM
      </span>
      {showSend && (
        <button
          type="button"
          className="absolute right-3 bottom-4 text-dim transition-colors hover:text-secondary"
        >
          <CornerDownLeft className="size-4" />
        </button>
      )}
    </div>
  )
}

// -- Main Component -----------------------------------------------------------

export function CommentSection({ postCid }: { postCid: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [session, setSession] = useState<{
    user: { id: string; name: string }
  } | null>(null)
  const [loaded, setLoaded] = useState(false)

  const loadComments = useCallback(async () => {
    const result = await fetchComments({ data: { postCid } })
    setComments(result)
  }, [postCid])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    Promise.all([loadComments(), getSession()]).then(([, sess]) => {
      setSession(
        sess ? { user: { id: sess.user.id, name: sess.user.name } } : null,
      )
      setLoaded(true)
    })
  }, [loadComments])

  if (!loaded) {
    return (
      <div>
        <p className="text-[13px] text-dim">Loading comments...</p>
      </div>
    )
  }

  void submitComment

  const rootComments = comments
    .filter((c) => !c.parentId)
    .toSorted(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )

  return (
    <div>
      {!session ? (
        <div className="rounded-lg border border-dashed border-boundary py-10">
          <div className="py-6 text-center">
            <Link
              to="/login"
              className="text-[13px] text-secondary transition-colors hover:text-foreground"
            >
              Log in to comment
            </Link>
          </div>
        </div>
      ) : (
        <CommentInput />
      )}

      {rootComments.length > 0 && (
        <div className="mt-6 space-y-5">
          {rootComments.map((comment) => (
            <div key={comment.id} className="flex gap-3 sm:-ml-11">
              <div
                className="mt-0.5 size-8 shrink-0 rounded-full border-2 border-boundary"
                style={{
                  backgroundColor: `hsl(${hashToHue(comment.userEmail)}, 40%, 55%)`,
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-foreground">
                    {comment.userName || 'Anonymous'}
                  </span>
                  <span className="text-[11px] text-dim">
                    {timeAgo(comment.createdAt)}
                  </span>
                </div>
                <div className="mt-1.5 inline-block rounded-lg rounded-tl-sm border border-foreground/3 bg-tint px-3 py-2">
                  <p className="text-[13.5px] leading-relaxed text-foreground/80">
                    {comment.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
