/* src/components/post/comment-section.tsx */

/* eslint-disable better-tailwindcss/no-unknown-classes */

import { useState, useEffect, useCallback } from 'react'
import { Link } from '@tanstack/react-router'
import { getSession } from '~/server/session'
import { fetchComments, submitComment } from '~/server/comments'

function gravatarUrl(email: string, size = 80): string {
  // Simple hash for Gravatar — use SubtleCrypto on client
  // Fallback: encode email directly, actual md5 computed in useEffect
  return `https://www.gravatar.com/avatar/?d=mp&s=${size}`
}

function GravatarImg({
  email,
  size = 80,
  className,
}: {
  email: string
  size?: number
  className?: string
}) {
  const [src, setSrc] = useState(gravatarUrl('', size))

  useEffect(() => {
    const encoder = new TextEncoder()
    crypto.subtle
      .digest('SHA-256', encoder.encode(email.trim().toLowerCase()))
      .then((buf) => {
        const hex = Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
        setSrc(`https://www.gravatar.com/avatar/${hex}?d=mp&s=${size}`)
      })
  }, [email, size])

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={className}
      loading="lazy"
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

  if (!loaded) {
    return (
      <div className="post-comments mt-14 border-t border-border pt-8">
        <p className="post-comments__status text-[13px] text-tertiary">
          Loading comments...
        </p>
      </div>
    )
  }

  return (
    <div className="post-comments mt-14 border-t border-border pt-8">
      <h2 className="post-comments__title text-[15px] font-medium text-primary">
        Comments{comments.length > 0 ? ` (${comments.length})` : ''}
      </h2>

      {comments.length === 0 && !submitted && (
        <p className="post-comments__status mt-4 text-[13px] text-secondary">
          No comments yet.
        </p>
      )}

      {comments.length > 0 && (
        <div className="post-comments__list mt-6 space-y-6">
          {comments.map((c) => (
            <div key={c.id} className="post-comments__item flex gap-3">
              <GravatarImg
                email={c.userEmail}
                size={36}
                className="post-comments__avatar size-9 shrink-0 rounded-full"
              />
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
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
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
