/* src/components/post/comment-section.tsx */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import {
  CircleSlash,
  CornerDownLeft,
  MapPin,
  MessagesSquare,
  MonitorSmartphone,
  TabletSmartphone,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
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

const MOCK_LOCATIONS = ['Tokyo', 'Osaka', 'Shanghai', 'Singapore', 'Berlin']
const MOCK_UAS = [
  'Desktop Chrome',
  'Desktop Firefox',
  'iOS Safari',
  'Android Chrome',
  'macOS Safari',
]

function CommentMeta({
  email,
  onReply,
}: {
  email: string
  onReply?: () => void
}) {
  const hue = hashToHue(email)
  const isMobile = hue % 2 === 0
  const location = MOCK_LOCATIONS[hue % MOCK_LOCATIONS.length]
  const ua = MOCK_UAS[hue % MOCK_UAS.length]
  const DeviceIcon = isMobile ? TabletSmartphone : MonitorSmartphone

  return (
    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-dim opacity-0 transition-opacity group-hover:opacity-100">
      {onReply && (
        <button
          type="button"
          onClick={onReply}
          className="flex items-center gap-1 transition-colors hover:text-secondary"
        >
          <MessagesSquare className="size-3" strokeWidth={1.8} />
          <span>Reply</span>
        </button>
      )}
      <span className="flex items-center gap-1">
        <MapPin className="size-3" strokeWidth={1.8} />
        <span>{location}</span>
      </span>
      <span className="flex items-center gap-1">
        <DeviceIcon className="size-3" strokeWidth={1.8} />
        <span>{ua}</span>
      </span>
      <button
        type="button"
        className="flex items-center gap-1 transition-colors hover:text-secondary"
      >
        <CircleSlash className="size-3" strokeWidth={1.8} />
        <span>Hide</span>
      </button>
    </div>
  )
}

function ReplyInput({ onClose }: { onClose: () => void }) {
  const [value, setValue] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const showSend = value.trim().length >= 3

  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      // Focus moved to send button — keep open
      if (containerRef.current?.contains(e.relatedTarget as Node)) return
      // Empty — dismiss
      if (!value.trim()) onClose()
    },
    [value, onClose],
  )

  const handleSend = useCallback(() => {
    // TODO: wire up submitComment
    onClose()
  }, [onClose])

  return (
    <motion.div
      ref={containerRef}
      className="relative mt-2 overflow-hidden"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <textarea
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        placeholder="Write a reply..."
        rows={3}
        className="w-full resize-none rounded-xl border border-boundary bg-muted px-4 py-3 text-[14px] text-foreground outline-none placeholder:text-dim focus:border-dim/50"
      />
      {showSend && (
        <button
          type="button"
          onClick={handleSend}
          className="absolute right-3 bottom-3 text-dim transition-colors hover:text-secondary"
        >
          <CornerDownLeft className="size-4" />
        </button>
      )}
    </motion.div>
  )
}

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
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

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

  // Global chronological index (#0, #1, ...) across all comments
  const chronological = comments.toSorted(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
  const commentIndex = new Map<string, number>()
  for (let i = 0; i < chronological.length; i++)
    commentIndex.set(chronological[i].id, i)

  // Group replies by root ancestor (flatten deep nesting into one level)
  const repliesByRoot = new Map<string, Comment[]>()
  const parentToRoot = new Map<string, string>()
  for (const c of rootComments) parentToRoot.set(c.id, c.id)

  // Resolve root ancestor for each reply
  const replies = comments
    .filter((c) => c.parentId)
    .toSorted(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
  for (const c of replies) {
    const pid = c.parentId ?? ''
    const rootId = parentToRoot.get(pid) ?? pid
    parentToRoot.set(c.id, rootId)
    const group = repliesByRoot.get(rootId)
    if (group) group.push(c)
    else repliesByRoot.set(rootId, [c])
  }

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
        <div className="mt-6 space-y-3">
          {rootComments.map((comment, i) => (
            <motion.div
              key={comment.id}
              id={`comment-${commentIndex.get(comment.id) ?? 0}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
            >
              {/* Root comment */}
              <div className="group flex gap-3 sm:-ml-11">
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
                    <a
                      href={`#comment-${commentIndex.get(comment.id) ?? 0}`}
                      className="text-[11px] text-dim transition-colors hover:text-secondary"
                    >
                      #{commentIndex.get(comment.id) ?? 0}
                    </a>
                    <span className="text-[11px] text-dim">
                      {timeAgo(comment.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1.5 inline-block rounded-lg rounded-tl-sm border border-foreground/3 bg-tint px-3 py-2">
                    <p className="text-[13.5px] leading-relaxed text-foreground/80">
                      {comment.content}
                    </p>
                  </div>
                  <CommentMeta
                    email={comment.userEmail}
                    onReply={() => setReplyingTo(comment.id)}
                  />
                  <AnimatePresence>
                    {replyingTo === comment.id && (
                      <ReplyInput onClose={() => setReplyingTo(null)} />
                    )}
                  </AnimatePresence>
                </div>
              </div>
              {/* Replies (flattened under root) */}
              {repliesByRoot.get(comment.id)?.map((reply, ri) => (
                <motion.div
                  key={reply.id}
                  id={`comment-${commentIndex.get(reply.id) ?? 0}`}
                  className="group mt-2 flex gap-2.5"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.2,
                    delay: (i + 1) * 0.04 + ri * 0.03,
                  }}
                >
                  <div
                    className="mt-0.5 size-7 shrink-0 rounded-full border-2 border-boundary"
                    style={{
                      backgroundColor: `hsl(${hashToHue(reply.userEmail)}, 40%, 55%)`,
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-foreground">
                        {reply.userName || 'Anonymous'}
                      </span>
                      <a
                        href={`#comment-${commentIndex.get(reply.id) ?? 0}`}
                        className="text-[11px] text-dim transition-colors hover:text-secondary"
                      >
                        #{commentIndex.get(reply.id) ?? 0}
                      </a>
                      <span className="text-[11px] text-dim">
                        {timeAgo(reply.createdAt)}
                      </span>
                    </div>
                    <div className="mt-1 inline-block rounded-lg rounded-tl-sm border border-foreground/3 bg-tint px-3 py-2">
                      <p className="text-[13.5px] leading-relaxed text-foreground/80">
                        {reply.content}
                      </p>
                    </div>
                    <CommentMeta
                      email={reply.userEmail}
                      onReply={() => setReplyingTo(reply.id)}
                    />
                    <AnimatePresence>
                      {replyingTo === reply.id && (
                        <ReplyInput onClose={() => setReplyingTo(null)} />
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
