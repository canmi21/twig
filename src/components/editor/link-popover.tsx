/* src/components/editor/link-popover.tsx */

/* src/components/editor/link-popover.tsx
 *
 * Floating popover for inserting or editing a link.
 * Appears near the cursor/selection when the Link toolbar button is clicked.
 */

import { useState, useEffect, useRef, useCallback } from 'react'

export interface LinkPopoverState {
  open: boolean
  x: number
  y: number
  /** Pre-filled text from selection (empty if collapsed cursor) */
  selectedText: string
  /** Existing href if cursor is inside a link */
  existingHref: string
}

interface LinkPopoverProps {
  state: LinkPopoverState
  onSubmit: (href: string, text?: string) => void
  onRemove: () => void
  onClose: () => void
}

const inputClass =
  'w-full rounded-sm border border-border bg-surface px-2 py-1 text-sm text-primary outline-none focus:border-secondary'

/** Inner form — mounts fresh each time the popover opens */
function LinkForm({ state, onSubmit, onRemove, onClose }: LinkPopoverProps) {
  const [href, setHref] = useState(state.existingHref)
  const [text, setText] = useState(state.selectedText)
  const hrefRef = useRef<HTMLInputElement>(null)
  const isEditing = state.existingHref !== ''
  const needsText = !state.selectedText && !isEditing

  useEffect(() => {
    requestAnimationFrame(() => hrefRef.current?.focus())
  }, [])

  const handleSubmit = useCallback(() => {
    const trimmed = href.trim()
    if (!trimmed) return
    onSubmit(trimmed, needsText ? text.trim() || trimmed : undefined)
  }, [href, text, needsText, onSubmit])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.isComposing) return
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        handleSubmit()
      }
    }
    document.addEventListener('keydown', handler, { capture: true })
    return () =>
      document.removeEventListener('keydown', handler, { capture: true })
  }, [handleSubmit, onClose])

  return (
    <div className="p-3">
      {needsText && (
        <label className="mb-2 block">
          <span className="mb-0.5 block text-xs text-secondary">Text</span>
          <input
            type="text"
            placeholder="Link text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={inputClass}
          />
        </label>
      )}
      <label className="block">
        <span className="mb-0.5 block text-xs text-secondary">URL</span>
        <input
          ref={hrefRef}
          type="text"
          placeholder="https://..."
          value={href}
          onChange={(e) => setHref(e.target.value)}
          className={inputClass}
        />
      </label>
      <div className="mt-2 flex justify-end gap-2">
        {isEditing && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-sm px-2.5 py-1 text-xs text-red-500 hover:text-red-400"
          >
            Remove
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-sm px-2.5 py-1 text-xs text-secondary hover:text-primary"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="rounded-sm bg-primary px-2.5 py-1 text-xs text-surface"
        >
          {isEditing ? 'Update' : 'Insert'}
        </button>
      </div>
    </div>
  )
}

export function LinkPopover(props: LinkPopoverProps) {
  if (!props.state.open) return null

  return (
    <div
      className="fixed z-50"
      style={{ left: props.state.x, top: props.state.y }}
    >
      <div className="w-64 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
        <LinkForm {...props} />
      </div>
    </div>
  )
}
