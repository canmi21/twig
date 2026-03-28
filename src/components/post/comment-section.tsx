/* src/components/post/comment-section.tsx */

import { useState, useEffect, useCallback } from 'react'
import { Link } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'motion/react'
import { getSession } from '~/server/session'
import { fetchComments, submitComment } from '~/server/comments'

// -- Helpers ------------------------------------------------------------------

function GravatarImg({
  email,
  size = 80,
  className,
}: {
  email: string
  size?: number
  className?: string
}) {
  const [src, setSrc] = useState(
    `https://www.gravatar.com/avatar/?d=mp&s=${size}`,
  )

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

// -- Types --------------------------------------------------------------------

interface Comment {
  id: string
  content: string
  createdAt: string
  parentId: string | null
  userName: string
  userEmail: string
}

interface ThreadNode {
  comment: Comment
  children: ThreadNode[]
}

// -- Thread tree builder ------------------------------------------------------

function buildThreadTree(flatComments: Comment[]): ThreadNode[] {
  const map = new Map<string, ThreadNode>()
  const roots: ThreadNode[] = []

  for (const c of flatComments) {
    map.set(c.id, { comment: c, children: [] })
  }

  for (const c of flatComments) {
    const node = map.get(c.id)
    if (!node) continue
    if (!c.parentId) {
      roots.push(node)
    } else {
      const parent = map.get(c.parentId)
      if (parent) {
        parent.children.push(node)
      } else {
        // Orphan (parent not approved) — show as top-level
        roots.push(node)
      }
    }
  }

  return roots
}

/** Flatten a branch into a linear chain (depth-first, following first child). */
function flattenChain(node: ThreadNode): Comment[] {
  const chain: Comment[] = [node.comment]
  let current = node
  while (current.children.length > 0) {
    current = current.children[0]
    chain.push(current.comment)
  }
  return chain
}

/**
 * Collect all reply chains under a top-level comment.
 * Each direct child starts its own chain, flattened depth-first via first-child.
 */
function collectChains(node: ThreadNode): Comment[][] {
  return node.children.map((child) => flattenChain(child))
}

// -- Default collapse threshold -----------------------------------------------

const CHAIN_COLLAPSE_THRESHOLD = 3

// -- Components ---------------------------------------------------------------

function CommentBubble({
  comment,
  onReply,
  animationDelay,
}: {
  comment: Comment
  onReply: (comment: Comment) => void
  animationDelay?: number
}) {
  return (
    <motion.div
      className="flex gap-3"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: animationDelay ?? 0 }}
    >
      <GravatarImg
        email={comment.userEmail}
        size={36}
        className="size-9 shrink-0 rounded-full bg-raised"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-medium text-primary">
            {comment.userName || 'Anonymous'}
          </span>
          <span className="text-[12px] text-tertiary">
            {timeAgo(comment.createdAt)}
          </span>
        </div>
        <p className="mt-1 text-[14px] leading-relaxed text-primary">
          {comment.content}
        </p>
        <button
          type="button"
          onClick={() => onReply(comment)}
          className="mt-1 text-[12px] text-tertiary transition-colors hover:text-secondary"
        >
          Reply
        </button>
      </div>
    </motion.div>
  )
}

function ReplyChain({
  chain,
  commentMap,
  expandedThreads,
  onToggleExpand,
  onReply,
}: {
  chain: Comment[]
  commentMap: Map<string, Comment>
  expandedThreads: Set<string>
  onToggleExpand: (chainId: string) => void
  onReply: (comment: Comment) => void
}) {
  if (chain.length === 0) return null

  // Chain ID is the first comment's ID
  const chainId = chain[0].id
  const isExpanded = expandedThreads.has(chainId)
  const needsCollapse = chain.length > CHAIN_COLLAPSE_THRESHOLD

  // Resolve @mention: find the parent comment's author name
  const resolveReplyTarget = (c: Comment): string | null => {
    if (!c.parentId) return null
    const parent = commentMap.get(c.parentId)
    return parent ? parent.userName || 'Anonymous' : null
  }

  const visibleComments = (() => {
    if (!needsCollapse || isExpanded) return chain
    // Show first and last
    return [chain[0], chain[chain.length - 1]]
  })()

  const hiddenCount = chain.length - 2

  return (
    <div className="relative ml-4 border-l border-border pl-4">
      {visibleComments.map((c, i) => {
        const replyTarget = resolveReplyTarget(c)
        const showCollapseButton =
          needsCollapse && !isExpanded && i === 0 && hiddenCount > 0

        return (
          <div key={c.id}>
            <div className="py-2">
              <motion.div
                className="flex gap-3"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <GravatarImg
                  email={c.userEmail}
                  size={32}
                  className="size-8 shrink-0 rounded-full bg-raised"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-medium text-primary">
                      {c.userName || 'Anonymous'}
                    </span>
                    {replyTarget && (
                      <span className="text-[12px] text-tertiary">
                        @{replyTarget}
                      </span>
                    )}
                    <span className="text-[12px] text-tertiary">
                      {timeAgo(c.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-[14px] leading-relaxed text-primary">
                    {c.content}
                  </p>
                  <button
                    type="button"
                    onClick={() => onReply(c)}
                    className="mt-1 text-[12px] text-tertiary transition-colors hover:text-secondary"
                  >
                    Reply
                  </button>
                </div>
              </motion.div>
            </div>

            {showCollapseButton && (
              <button
                type="button"
                onClick={() => onToggleExpand(chainId)}
                className="my-1 flex items-center gap-2 text-[12px] text-secondary transition-colors hover:text-primary"
              >
                <span className="h-px w-4 bg-border" />
                Show {hiddenCount} more{' '}
                {hiddenCount === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>
        )
      })}

      {needsCollapse && isExpanded && (
        <button
          type="button"
          onClick={() => onToggleExpand(chainId)}
          className="my-1 flex items-center gap-2 text-[12px] text-secondary transition-colors hover:text-primary"
        >
          <span className="h-px w-4 bg-border" />
          Show less
        </button>
      )}
    </div>
  )
}

function InlineReplyForm({
  replyingTo,
  postCid,
  onSubmitted,
  onCancel,
}: {
  replyingTo: { id: string; userName: string }
  postCid: string
  onSubmitted: () => void
  onCancel: () => void
}) {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await submitComment({
        data: {
          postCid,
          content: content.trim(),
          parentId: replyingTo.id,
        },
      })
      setContent('')
      onSubmitted()
    } catch {
      setError('Failed to submit reply')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="ml-4 border-l border-border pt-2 pl-4"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div className="mb-2 text-[12px] text-secondary">
        Replying to {replyingTo.userName || 'Anonymous'}
        <button
          type="button"
          onClick={onCancel}
          className="ml-2 text-tertiary transition-colors hover:text-secondary"
        >
          Cancel
        </button>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a reply..."
        maxLength={2000}
        rows={2}
        className="w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-[14px] text-primary transition-colors outline-none placeholder:text-tertiary focus:border-secondary"
      />
      {error && <p className="mt-1 text-[12px] text-danger">{error}</p>}
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[12px] text-tertiary">{content.length}/2000</span>
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="rounded-md bg-primary px-3 py-1 text-[12px] font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Reply'}
        </button>
      </div>
    </motion.form>
  )
}

// -- Main Component -----------------------------------------------------------

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
  const [replyingTo, setReplyingTo] = useState<{
    id: string
    userName: string
  } | null>(null)
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set())

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

  const commentMap = new Map(comments.map((c) => [c.id, c]))

  function handleToggleExpand(chainId: string) {
    setExpandedThreads((prev) => {
      const next = new Set(prev)
      if (next.has(chainId)) next.delete(chainId)
      else next.add(chainId)
      return next
    })
  }

  function handleReply(comment: Comment) {
    setReplyingTo({ id: comment.id, userName: comment.userName })
  }

  function handleReplySubmitted() {
    setReplyingTo(null)
    setSubmitted(true)
  }

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
      <div className="mt-14 border-t border-border pt-8">
        <p className="text-[13px] text-tertiary">Loading comments...</p>
      </div>
    )
  }

  const threadTree = buildThreadTree(comments)
  const totalCount = comments.length

  return (
    <div className="mt-14 border-t border-border pt-8">
      <h2 className="text-[15px] font-medium text-primary">
        Comments{totalCount > 0 ? ` (${totalCount})` : ''}
      </h2>

      {totalCount === 0 && !submitted && (
        <p className="mt-4 text-[13px] text-secondary">No comments yet.</p>
      )}

      {threadTree.length > 0 && (
        <div className="mt-6 space-y-6">
          {threadTree.map((node, i) => {
            const chains = collectChains(node)
            return (
              <div key={node.comment.id}>
                <CommentBubble
                  comment={node.comment}
                  onReply={handleReply}
                  animationDelay={i * 0.05}
                />

                {/* Inline reply form for this comment */}
                <AnimatePresence>
                  {replyingTo?.id === node.comment.id && session && (
                    <InlineReplyForm
                      replyingTo={replyingTo}
                      postCid={postCid}
                      onSubmitted={handleReplySubmitted}
                      onCancel={() => setReplyingTo(null)}
                    />
                  )}
                </AnimatePresence>

                {/* Reply chains */}
                {chains.map((chain) => (
                  <div key={chain[0].id}>
                    <ReplyChain
                      chain={chain}
                      commentMap={commentMap}
                      expandedThreads={expandedThreads}
                      onToggleExpand={handleToggleExpand}
                      onReply={handleReply}
                    />
                    {/* Inline reply form for replies in this chain */}
                    <AnimatePresence>
                      {replyingTo &&
                        chain.some((c) => c.id === replyingTo.id) &&
                        replyingTo.id !== node.comment.id &&
                        session && (
                          <div className="ml-4 border-l border-border pl-4">
                            <InlineReplyForm
                              replyingTo={replyingTo}
                              postCid={postCid}
                              onSubmitted={handleReplySubmitted}
                              onCancel={() => setReplyingTo(null)}
                            />
                          </div>
                        )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Top-level comment form */}
      <div className="mt-8">
        <AnimatePresence mode="wait">
          {!session ? (
            <motion.p
              key="login"
              className="text-[13px] text-secondary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
            >
              <Link
                to="/login"
                className="text-primary transition-colors hover:text-secondary"
              >
                Sign in
              </Link>{' '}
              to leave a comment.
            </motion.p>
          ) : submitted ? (
            <motion.p
              key="submitted"
              className="text-[13px] text-success"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              Comment submitted, pending review.
            </motion.p>
          ) : (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
            >
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write a comment..."
                maxLength={2000}
                rows={3}
                className="w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-[14px] text-primary transition-colors outline-none placeholder:text-tertiary focus:border-secondary"
              />
              {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[12px] text-tertiary">
                  {content.length}/2000
                </span>
                <button
                  type="submit"
                  disabled={submitting || !content.trim()}
                  className="rounded-md bg-primary px-3 py-1.5 text-[13px] font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
