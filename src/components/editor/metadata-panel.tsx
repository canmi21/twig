/* src/components/editor/metadata-panel.tsx */

/* src/components/editor/metadata-panel.tsx
 *
 * Slide-over panel for editing post metadata.
 * Rendered as a right-side overlay with motion animation.
 */

import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'
import type { Frontmatter } from '~/lib/compiler/index'

interface MetadataPanelProps {
  open: boolean
  onClose: () => void
  metadata: Frontmatter
  onMetadataChange: (update: Partial<Frontmatter>) => void
  slug: string
  onSlugChange: (slug: string) => void
  category: string
  onCategoryChange: (category: string) => void
}

const labelClass = 'block text-xs font-medium text-secondary mb-1'
const inputClass =
  'w-full rounded-sm border border-border bg-surface px-2.5 py-1.5 text-sm text-primary outline-none focus:border-secondary'
const fieldClass = 'mb-3 block'

export function MetadataPanel({
  open,
  onClose,
  metadata,
  onMetadataChange,
  slug,
  onSlugChange,
  category,
  onCategoryChange,
}: MetadataPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const tagsString = metadata.tags?.join(', ') ?? ''

  function handleTagsChange(value: string) {
    const tags = value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    onMetadataChange({ tags: tags.length > 0 ? tags : undefined })
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/10 dark:bg-black/30"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="fixed top-0 right-0 z-50 flex h-full w-80 flex-col border-l border-border bg-surface shadow-lg"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="text-sm font-medium text-primary">Metadata</span>
              <button
                type="button"
                onClick={onClose}
                className="rounded-sm p-1 text-secondary hover:text-primary"
              >
                <X className="size-3.5" strokeWidth={1.8} />
              </button>
            </div>

            {/* Fields */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <label className={fieldClass}>
                <span className={labelClass}>Title</span>
                <input
                  type="text"
                  value={metadata.title}
                  onChange={(e) => onMetadataChange({ title: e.target.value })}
                  maxLength={200}
                  className={inputClass}
                />
              </label>

              <label className={fieldClass}>
                <span className={labelClass}>Slug</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => onSlugChange(e.target.value)}
                  className={inputClass}
                />
              </label>

              <label className={fieldClass}>
                <span className={labelClass}>Category</span>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => onCategoryChange(e.target.value)}
                  className={inputClass}
                />
              </label>

              <label className={fieldClass}>
                <span className={labelClass}>Description</span>
                <textarea
                  value={metadata.description ?? ''}
                  onChange={(e) =>
                    onMetadataChange({
                      description: e.target.value || undefined,
                    })
                  }
                  maxLength={500}
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </label>

              <label className={fieldClass}>
                <span className={labelClass}>Tags (comma-separated)</span>
                <input
                  type="text"
                  value={tagsString}
                  onChange={(e) => handleTagsChange(e.target.value)}
                  placeholder="e.g. engineering, rust"
                  className={inputClass}
                />
                {metadata.tags && metadata.tags.length > 5 && (
                  <p className="mt-1 text-xs text-red-500">Max 5 tags</p>
                )}
              </label>

              <label className={fieldClass}>
                <span className={labelClass}>Tweet ID</span>
                <input
                  type="text"
                  value={metadata.tweet ?? ''}
                  onChange={(e) =>
                    onMetadataChange({
                      tweet: e.target.value || undefined,
                    })
                  }
                  placeholder="Numeric tweet ID"
                  className={inputClass}
                />
              </label>

              <div className={fieldClass}>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={metadata.published ?? false}
                    onChange={(e) =>
                      onMetadataChange({ published: e.target.checked })
                    }
                    className="size-3.5"
                  />
                  <span className="text-sm text-primary">Published</span>
                </label>
              </div>

              {/* Read-only timestamps */}
              {metadata.created_at && (
                <div className={fieldClass}>
                  <span className={labelClass}>Created</span>
                  <div className="text-xs text-secondary">
                    {new Date(metadata.created_at).toLocaleString()}
                  </div>
                </div>
              )}
              {metadata.updated_at && (
                <div className={fieldClass}>
                  <span className={labelClass}>Updated</span>
                  <div className="text-xs text-secondary">
                    {new Date(metadata.updated_at).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
