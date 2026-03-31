/* src/components/post/comment-section.tsx */

/* eslint-disable better-tailwindcss/no-unknown-classes */

import { useState, useEffect, useCallback } from 'react'
import { Link } from '@tanstack/react-router'
import { getSession } from '~/server/session'
import { fetchComments, submitComment } from '~/server/comments'

const AVATAR_COLORS = [
  '#DCE7F8',
  '#EFD9CF',
  '#DDEBD7',
  '#E8DDF6',
  '#EFE4C9',
  '#DCE8E4',
] as const

function getAvatarColor(seed: string): string {
  let hash = 0
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function CommentAvatar({ seed }: { seed: string }) {
  return (
    <span
      aria-hidden="true"
      className="post-comments__avatar shrink-0 rounded-full"
      style={{ backgroundColor: getAvatarColor(seed) }}
    />
  )
}

function NestedCommentAvatar({ seed }: { seed: string }) {
  return (
    <span
      aria-hidden="true"
      className="post-comments__avatar post-comments__avatar--nested shrink-0 rounded-full"
      style={{ backgroundColor: getAvatarColor(seed) }}
    />
  )
}

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

interface Comment {
  id: string
  content: string
  createdAt: string
  parentId: string | null
  userName: string
  userEmail: string
}

export function CommentSection({ postCid }: { postCid: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [session, setSession] = useState<{
    user: { id: string; name: string }
  } | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(
    () => new Set(),
  )
  const rootComments = comments.filter((comment) => comment.parentId === null)
  const commentsByParent = comments.reduce<Record<string, Comment[]>>(
    (groups, comment) => {
      if (!comment.parentId) return groups
      groups[comment.parentId] ??= []
      groups[comment.parentId].push(comment)
      return groups
    },
    {},
  )

  const loadComments = useCallback(async () => {
    const result = await fetchComments({ data: { postCid } })
    setComments(result)
  }, [postCid])

  useEffect(() => {
    Promise.all([loadComments(), getSession()]).then(([, sess]) => {
      setSession(
        sess ? { user: { id: sess.user.id, name: sess.user.name } } : null,
      )
      setLoaded(true)
    })
  }, [loadComments])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await submitComment({ data: { postCid, content: content.trim() } })
      setContent('')
      setSubmitted(true)
    } catch {
      setError('Failed to submit comment')
    } finally {
      setSubmitting(false)
    }
  }

  function toggleThread(commentId: string) {
    setExpandedThreads((current) => {
      const next = new Set(current)
      if (next.has(commentId)) {
        const stack = [commentId]
        while (stack.length > 0) {
          const id = stack.pop()
          if (!id) continue
          next.delete(id)
          const replies: Comment[] = commentsByParent[id] ?? []
          for (const reply of replies) {
            stack.push(reply.id)
          }
        }
      } else {
        let currentId: string | null = commentId
        while (currentId) {
          next.add(currentId)
          const replies: Comment[] = commentsByParent[currentId] ?? []
          if (replies.length !== 1) break
          currentId = replies[0].id
        }
      }
      return next
    })
  }

  function renderReplies(parentId: string, depth = 1) {
    const replies: Comment[] = commentsByParent[parentId] ?? []
    if (!replies?.length) return null

    const shouldCollapse = depth >= 2
    const isExpanded = expandedThreads.has(parentId)
    const toggleLabel =
      replies.length === 1
        ? 'View 1 more reply'
        : `View ${replies.length} more replies`

    if (shouldCollapse && !isExpanded) {
      return (
        <button
          type="button"
          className="post-comments__thread-toggle"
          onClick={() => toggleThread(parentId)}
        >
          <span className="post-comments__thread-toggle-label">
            {toggleLabel}
          </span>
        </button>
      )
    }

    return (
      <div className="post-comments__thread-block">
        <div className="post-comments__replies">
          {replies.map((reply) => (
            <article
              key={reply.id}
              className="post-comments__reply flex gap-3"
              data-depth={depth}
            >
              <NestedCommentAvatar
                seed={`${reply.userEmail}:${reply.userName}`}
              />
              <div className="post-comments__content min-w-0 flex-1">
                <div className="post-comments__meta flex items-baseline gap-2">
                  <span className="post-comments__author text-[13px] font-medium text-primary">
                    {reply.userName}
                  </span>
                  <span className="post-comments__time text-[12px] text-tertiary">
                    {timeAgo(reply.createdAt)}
                  </span>
                </div>
                <p className="post-comments__text mt-1 text-[14px] leading-relaxed text-primary">
                  {reply.content}
                </p>
                {renderReplies(reply.id, depth + 1)}
              </div>
            </article>
          ))}
        </div>
        {shouldCollapse && (
          <button
            type="button"
            className="post-comments__thread-toggle"
            onClick={() => toggleThread(parentId)}
          >
            <span className="post-comments__thread-toggle-label">
              Hide replies
            </span>
          </button>
        )}
      </div>
    )
  }

  if (!loaded) {
    return (
      <div className="post-comments mt-14">
        <p className="post-comments__status text-[13px] text-tertiary">
          Loading comments...
        </p>
      </div>
    )
  }

  return (
    <div className="post-comments mt-14">
      {rootComments.length === 0 && !submitted && (
        <p className="post-comments__status text-[13px] text-secondary">
          No comments yet.
        </p>
      )}

      {rootComments.length > 0 && (
        <div className="post-comments__list">
          {rootComments.map((c) => (
            <article key={c.id} className="post-comments__item flex gap-3">
              <CommentAvatar seed={`${c.userEmail}:${c.userName}`} />
              <div className="post-comments__content min-w-0 flex-1">
                <div className="post-comments__meta flex items-baseline gap-2">
                  <span className="post-comments__author text-[13px] font-medium text-primary">
                    {c.userName}
                  </span>
                  <span className="post-comments__time text-[12px] text-tertiary">
                    {timeAgo(c.createdAt)}
                  </span>
                </div>
                <p className="post-comments__text mt-1 text-[14px] leading-relaxed text-primary">
                  {c.content}
                </p>
                {renderReplies(c.id)}
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="post-comments__composer">
        {!session ? (
          <p className="post-comments__signin text-[13px] text-secondary">
            <Link
              to="/login"
              className="post-comments__signin-link text-primary hover:underline"
            >
              Sign in
            </Link>{' '}
            to leave a comment.
          </p>
        ) : submitted ? (
          <p className="post-comments__status text-[13px] text-secondary">
            Comment submitted, pending review.
          </p>
        ) : (
          <form className="post-comments__form" onSubmit={handleSubmit}>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write a comment..."
              maxLength={2000}
              rows={3}
              className="post-comments__textarea w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-[14px] text-primary outline-none placeholder:text-tertiary focus:border-secondary"
            />
            {error && (
              <p className="post-comments__error mt-2 text-[13px] text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            <div className="post-comments__form-footer mt-2 flex items-center justify-between">
              <span className="post-comments__count text-[12px] text-tertiary">
                {content.length}/2000
              </span>
              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="post-comments__submit rounded-md bg-primary px-3 py-1.5 text-[13px] font-medium text-surface disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
