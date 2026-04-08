/* src/components/editor/raw-editor.tsx */

/* src/components/editor/raw-editor.tsx
 *
 * Simple textarea editor for raw markdown editing mode.
 * Supports Tab key indentation and paste-to-upload images.
 */

import { useCallback } from 'react'
import type { PasteImageHandler } from './plugins'

export interface RawEditorProps {
  value: string
  onChange: (value: string) => void
  onPasteImage?: PasteImageHandler
}

export function RawEditor({ value, onChange, onPasteImage }: RawEditorProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        const ta = e.currentTarget
        const start = ta.selectionStart
        const end = ta.selectionEnd
        const next =
          ta.value.substring(0, start) + '\t' + ta.value.substring(end)
        onChange(next)
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 1
        })
      }
    },
    [onChange],
  )

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (!onPasteImage) return

      const file = Array.from(e.clipboardData.items)
        .find((item) => item.type.startsWith('image/'))
        ?.getAsFile()
      if (!file) return

      e.preventDefault()
      const ta = e.currentTarget
      const start = ta.selectionStart
      const end = ta.selectionEnd

      const placeholder = '::image{src="uploading..." alt=""}'
      const before = value.substring(0, start)
      const after = value.substring(end)
      onChange(before + placeholder + after)

      const src = await onPasteImage(file)
      if (src) {
        const directive = `::image{src="${src}" alt=""}`
        // Replace placeholder in current value
        const current = before + placeholder + after
        onChange(current.replace(placeholder, directive))
      }
    },
    [value, onChange, onPasteImage],
  )

  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      className="min-h-0 w-full flex-1 resize-none border-none bg-surface p-6 font-mono text-[13px]/6 text-primary outline-none"
      spellCheck={false}
      placeholder="Start writing markdown..."
    />
  )
}
