/* src/components/post/comment-section.tsx */

/* eslint-disable better-tailwindcss/no-unknown-classes */

import { useState, useEffect, useCallback } from 'react'
import {
  CornerDownLeft,
  Map,
  MessagesSquare,
  MonitorSmartphone,
  TabletSmartphone,
} from 'lucide-react'
import { Link, useLocation, useRouteContext } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { getSession } from '~/server/session'
import { fetchComments, submitComment } from '~/server/comments'
import { timeAgo } from '~/lib/utils/date'

const AVATAR_COLORS = [
  '#DCE7F8',
  '#EFD9CF',
  '#DDEBD7',
  '#E8DDF6',
  '#EFE4C9',
  '#DCE8E4',
] as const
// Total visible nesting is capped at 3 layers:
// top-level comment + first reply layer + all deeper replies flattened together.
const MAX_VISUAL_REPLY_DEPTH = 2
const COLLAPSE_START_DEPTH = 2

function getAvatarColor(seed: string): string {
  let hash = 0
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function useAvatarUrl(userId: string) {
  const { cdnPublicUrl } = useRouteContext({ from: '__root__' })
  const prefix = import.meta.env.DEV ? '/api/object' : cdnPublicUrl
  return `${prefix}/avatar/${userId}.webp`
}

function CommentAvatar({
  seed,
  userId,
  nested,
}: {
  seed: string
  userId: string
  nested?: boolean
}) {
  const [imgError, setImgError] = useState(false)
  const src = useAvatarUrl(userId)

  return (
    <span
      aria-hidden="true"
      className={`${nested ? 'comments__avatar comments__avatar--nested' : 'comments__avatar'} shrink-0 overflow-hidden rounded-full`}
      style={{ backgroundColor: getAvatarColor(seed) }}
    >
      {!imgError && (
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          onError={() => setImgError(true)}
        />
      )}
    </span>
  )
}

interface Comment {
  id: string
  content: string
  createdAt: string
  parentId: string | null
  userId: string
  userName: string
  userEmail: string
  userAgent: string
  location: string
}

function formatCommentLocation(location: string): string | null {
  const trimmed = location.trim()
  if (!trimmed) return null

  const parts = trimmed.split(/\s+/)
  if (parts.length >= 2 && parts[0] === parts.at(-1)) {
    return parts[0]
  }

  return trimmed
}

function getClientLabel(userAgent: string): {
  device: 'desktop' | 'portable'
  label: string
} | null {
  const ua = userAgent.trim()
  if (!ua) return null

  const lower = ua.toLowerCase()
  const isTablet = /ipad|tablet/.test(lower)
  const isMobile = /iphone|android|mobile/.test(lower)
  const device: 'desktop' | 'portable' =
    isTablet || isMobile ? 'portable' : 'desktop'

  let browser = 'Browser'
  if (lower.includes('edg/')) {
    browser = 'Edge'
  } else if (lower.includes('opr/') || lower.includes('opera')) {
    browser = 'Opera'
  } else if (lower.includes('firefox') || lower.includes('fxios')) {
    browser = 'Firefox'
  } else if (lower.includes('crios') || lower.includes('chrome')) {
    browser = 'Chrome'
  } else if (lower.includes('safari')) {
    browser = 'Safari'
  }

  let os = ''
  if (/iphone|ipad|cpu iphone os|cpu os/.test(lower)) {
    os = 'iOS'
  } else if (lower.includes('android')) {
    os = 'Android'
  } else if (lower.includes('mac os x') || lower.includes('macintosh')) {
    os = 'MacOS'
  } else if (lower.includes('windows')) {
    os = 'Windows'
  } else if (lower.includes('linux')) {
    os = 'Linux'
  }

  if (device === 'portable') {
    if (os === 'iOS') return { device, label: `iOS ${browser}` }
    if (os === 'Android') return { device, label: `Android ${browser}` }
    return {
      device,
      label: isTablet ? `Tablet ${browser}` : `Mobile ${browser}`,
    }
  }

  if (os === 'MacOS') return { device, label: `MacOS ${browser}` }
  return { device, label: `Desktop ${browser}` }
}

export function CommentSection({ postCid }: { postCid: string }) {
  const location = useLocation()
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
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [replySubmittingId, setReplySubmittingId] = useState<string | null>(
    null,
  )
  const [replyError, setReplyError] = useState<string | null>(null)
  const [replyNoticeFor, setReplyNoticeFor] = useState<string | null>(null)
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

  async function handleReplySubmit(e: React.FormEvent, parentId: string) {
    e.preventDefault()
    if (!replyContent.trim()) return
    setReplySubmittingId(parentId)
    setReplyError(null)
    try {
      await submitComment({
        data: { postCid, content: replyContent.trim(), parentId },
      })
      setReplyContent('')
      setActiveReplyId(null)
      setReplyNoticeFor(parentId)
      await loadComments()
    } catch {
      setReplyError('Failed to submit reply')
    } finally {
      setReplySubmittingId(null)
    }
  }

  function toggleReplyComposer(commentId: string) {
    setReplyError(null)
    setReplyNoticeFor(null)
    setActiveReplyId((current) => {
      if (current === commentId) return null
      setReplyContent('')
      return commentId
    })
  }

  function renderReplyTrigger(comment: Comment) {
    const isReplying = activeReplyId === comment.id
    const locationLabel = formatCommentLocation(comment.location)
    const clientLabel = getClientLabel(comment.userAgent)
    const DeviceIcon =
      clientLabel?.device === 'portable' ? TabletSmartphone : MonitorSmartphone

    return (
      <div className="flex flex-wrap items-center gap-x-[0.78rem] gap-y-[0.42rem] text-[11.5px] leading-[1.2] text-primary">
        {session && (
          <button
            type="button"
            className="comments__reply-trigger inline-flex items-center gap-[0.22rem]"
            data-active={isReplying}
            aria-label={
              isReplying
                ? `Hide reply composer for ${comment.userName}`
                : `Reply to ${comment.userName}`
            }
            onClick={() => toggleReplyComposer(comment.id)}
          >
            <MessagesSquare className="size-[0.88rem] stroke-[1.9]" />
            <span className="leading-none">Reply</span>
          </button>
        )}
        {locationLabel && (
          <span className="inline-flex items-center gap-[0.22rem] text-primary opacity-(--opacity-subtle)">
            <Map className="size-[0.82rem] stroke-[1.9]" />
            <span>{locationLabel}</span>
          </span>
        )}
        {clientLabel && (
          <span className="inline-flex items-center gap-[0.22rem] text-primary opacity-(--opacity-subtle)">
            <DeviceIcon className="size-[0.82rem] stroke-[1.9]" />
            <span>{clientLabel.label}</span>
          </span>
        )}
      </div>
    )
  }

  function renderReplyComposer(comment: Comment) {
    const isReplying = activeReplyId === comment.id
    const isSubmittingReply = replySubmittingId === comment.id
    const canSubmitReply = replyContent.trim().length >= 3

    return (
      <>
        {replyNoticeFor === comment.id && !isReplying && (
          <p className="mt-[0.52rem] text-[12px] leading-[1.4] text-primary opacity-(--opacity-subtle)">
            Reply submitted, pending review.
          </p>
        )}
        <AnimatePresence initial={false}>
          {session && isReplying && (
            <motion.div
              key={`reply-panel:${comment.id}`}
              className="overflow-hidden"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                height: {
                  duration: 0.24,
                  ease: [0.22, 1, 0.36, 1],
                },
                opacity: {
                  duration: 0.14,
                  ease: 'easeOut',
                },
              }}
              style={{ overflow: 'hidden' }}
            >
              <div className="pt-[0.62rem]">
                <form
                  className="flex flex-col gap-[0.48rem]"
                  onSubmit={(e) => handleReplySubmit(e, comment.id)}
                >
                  <div className="comments__field comments__field--reply">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder={`Reply to ${comment.userName}...`}
                      maxLength={2000}
                      rows={2}
                      className="comments__textarea comments__textarea--reply"
                    />
                    <div className="mt-[0.34rem] flex min-h-[1.23rem] items-center justify-between gap-[0.9rem]">
                      <span className="text-[11.5px] leading-none text-primary opacity-(--opacity-faint)">
                        {replyContent.length}/2000
                      </span>
                      <AnimatePresence initial={false}>
                        {canSubmitReply && (
                          <motion.button
                            key="reply-submit"
                            type="submit"
                            aria-label={
                              isSubmittingReply
                                ? 'Submitting reply'
                                : 'Submit reply'
                            }
                            disabled={isSubmittingReply}
                            className="comments__submit"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.16, ease: 'easeOut' }}
                          >
                            <CornerDownLeft className="size-[0.95rem] stroke-[2.1]" />
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  {replyError && (
                    <p className="text-[13px] leading-[1.35] text-error">
                      {replyError}
                    </p>
                  )}
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    )
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

  function countThreadReplies(parentId: string): number {
    const replies: Comment[] = commentsByParent[parentId] ?? []
    let total = replies.length
    for (const reply of replies) {
      total += countThreadReplies(reply.id)
    }
    return total
  }

  function renderReplies(parentId: string, depth = 1) {
    const replies: Comment[] = commentsByParent[parentId] ?? []
    if (!replies?.length) return null

    const visualDepth = Math.min(depth, MAX_VISUAL_REPLY_DEPTH)
    const shouldCollapse = depth === COLLAPSE_START_DEPTH
    const isExpanded = expandedThreads.has(parentId)
    const hiddenReplyCount = countThreadReplies(parentId)
    const toggleLabel =
      hiddenReplyCount === 1
        ? 'View 1 more reply'
        : `View ${hiddenReplyCount} more replies`

    const repliesContent = (
      <div
        className="comments__replies mt-[0.82rem] pl-[0.85rem]"
        data-depth={depth}
      >
        {replies.map((reply) => (
          <div
            key={reply.id}
            className="comments__reply-node"
            data-depth={visualDepth}
          >
            <article
              className="comments__reply flex gap-3"
              data-depth={visualDepth}
            >
              <CommentAvatar
                seed={`${reply.userEmail}:${reply.userName}`}
                userId={reply.userId}
                nested
              />
              <div className="min-w-0 flex-1">
                <div className="comments__body">
                  <div className="flex items-baseline gap-[0.38rem] leading-none">
                    <span className="text-[13px] font-[560] text-primary">
                      {reply.userName}
                    </span>
                    <span className="text-[12px] text-primary opacity-(--opacity-muted)">
                      {timeAgo(reply.createdAt)}
                    </span>
                  </div>
                  <p className="mt-[0.24rem] text-[14.5px] leading-[1.66] text-primary">
                    {reply.content}
                  </p>
                  <div
                    className="comments__actions"
                    data-active={activeReplyId === reply.id}
                  >
                    {renderReplyTrigger(reply)}
                  </div>
                  {renderReplyComposer(reply)}
                </div>
                {renderReplies(reply.id, depth + 1)}
              </div>
            </article>
          </div>
        ))}
      </div>
    )

    if (!shouldCollapse) {
      return repliesContent
    }

    return (
      <div className="mt-[0.48rem]">
        <button
          type="button"
          className="comments__thread-toggle"
          onClick={() => toggleThread(parentId)}
        >
          <span className="inline-block">
            {isExpanded ? 'Hide replies' : toggleLabel}
          </span>
        </button>
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              key="thread-panel"
              className="overflow-hidden"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                height: {
                  duration: 0.24,
                  ease: [0.22, 1, 0.36, 1],
                },
                opacity: {
                  duration: 0.14,
                  ease: 'easeOut',
                },
              }}
              style={{ overflow: 'hidden' }}
            >
              {repliesContent}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  if (!loaded) {
    return (
      <div className="mt-14">
        <p className="text-[13px] text-primary opacity-(--opacity-muted)">
          Loading comments...
        </p>
      </div>
    )
  }

  return (
    <div className="mt-14">
      {rootComments.length > 0 && (
        <div className="mt-0">
          {rootComments.map((comment) => (
            <article key={comment.id} className="comments__item flex gap-3">
              <CommentAvatar
                seed={`${comment.userEmail}:${comment.userName}`}
                userId={comment.userId}
              />
              <div className="min-w-0 flex-1">
                <div className="comments__body">
                  <div className="flex items-baseline gap-[0.38rem] leading-none">
                    <span className="text-[13px] font-[560] text-primary">
                      {comment.userName}
                    </span>
                    <span className="text-[12px] text-primary opacity-(--opacity-muted)">
                      {timeAgo(comment.createdAt)}
                    </span>
                  </div>
                  <p className="mt-[0.24rem] text-[14.5px] leading-[1.66] text-primary">
                    {comment.content}
                  </p>
                  <div
                    className="comments__actions"
                    data-active={activeReplyId === comment.id}
                  >
                    {renderReplyTrigger(comment)}
                  </div>
                  {renderReplyComposer(comment)}
                </div>
                {renderReplies(comment.id)}
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="mt-8">
        {!session ? (
          <p className="text-[13px] text-primary opacity-(--opacity-muted)">
            <Link
              to="/login"
              search={{ callback: location.pathname }}
              className="comments__signin-link text-primary hover:underline"
            >
              Sign in
            </Link>{' '}
            to leave a comment.
          </p>
        ) : submitted ? (
          <p className="text-[13px] text-primary opacity-(--opacity-muted)">
            Comment submitted, pending review.
          </p>
        ) : (
          <form className="flex flex-col gap-[0.58rem]" onSubmit={handleSubmit}>
            <div className="comments__field">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write a comment..."
                maxLength={2000}
                rows={3}
                className="comments__textarea"
              />
              <div className="mt-[0.44rem] flex min-h-[1.23rem] items-center justify-between gap-[0.9rem]">
                <span className="text-[11.5px] leading-none text-primary opacity-(--opacity-faint)">
                  {content.length}/2000
                </span>
                <AnimatePresence initial={false}>
                  {content.trim().length >= 3 && (
                    <motion.button
                      key="comment-submit"
                      type="submit"
                      aria-label={
                        submitting ? 'Submitting comment' : 'Submit comment'
                      }
                      disabled={submitting}
                      className="comments__submit"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.16, ease: 'easeOut' }}
                    >
                      <CornerDownLeft className="size-[0.95rem] stroke-[2.1]" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
            {error && (
              <p className="text-[13px] leading-[1.35] text-error">{error}</p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
