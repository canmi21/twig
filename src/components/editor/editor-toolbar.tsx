/* src/components/editor/editor-toolbar.tsx */

/* src/components/editor/editor-toolbar.tsx
 *
 * Top toolbar for the editor page. Contains formatting buttons,
 * directive insertion, mode toggle, metadata trigger, and save.
 */

import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Link as LinkIcon,
  Image,
  Video,
  AudioLines,
  ExternalLink,
  GitFork,
  Package,
  PilcrowLeft,
  FileCode2,
  Settings2,
  Save,
  Sun,
  Moon,
} from 'lucide-react'
import { toggleDocumentTheme } from '~/components/theme-toggle'

export type EditorMode = 'wysiwyg' | 'raw'

export interface ToolbarAction {
  (type: string, payload?: Record<string, string>): void
}

export interface EditorToolbarProps {
  view: EditorMode
  onViewChange: (view: EditorMode) => void
  onAction: ToolbarAction
  onMetadataToggle: () => void
  onSave: () => void
  saving: boolean
  feedback: { type: 'success' | 'error'; message: string } | null
}

// ---------------------------------------------------------------------------
// Shared button styles
// ---------------------------------------------------------------------------

const btnClass =
  'rounded-sm p-1.5 text-secondary transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-50'
const dividerClass = 'mx-1 h-4 w-px bg-border'
const iconSize = 'size-3.5'

function Btn({
  icon,
  title,
  onClick,
  active,
  disabled,
}: {
  icon: React.ReactNode
  title: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`${btnClass} ${active ? 'text-primary' : ''}`}
    >
      {icon}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Theme button (watches dark class)
// ---------------------------------------------------------------------------

function ThemeButton() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const sync = () => setIsDark(root.classList.contains('dark'))
    const obs = new MutationObserver(sync)
    sync()
    obs.observe(root, { attributeFilter: ['class'], attributes: true })
    return () => obs.disconnect()
  }, [])

  return (
    <Btn
      icon={
        isDark ? (
          <Sun className={iconSize} strokeWidth={1.8} />
        ) : (
          <Moon className={iconSize} strokeWidth={1.8} />
        )
      }
      title="Toggle theme"
      onClick={toggleDocumentTheme}
    />
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EditorToolbar({
  view,
  onViewChange,
  onAction,
  onMetadataToggle,
  onSave,
  saving,
  feedback,
}: EditorToolbarProps) {
  return (
    <header className="flex shrink-0 items-center border-b border-border px-2 py-1">
      {/* Left: back only */}
      <div className="flex min-w-0 flex-1 items-center">
        <Link to="/@/contents" className={btnClass} title="Back to contents">
          <ArrowLeft className={iconSize} strokeWidth={1.8} />
        </Link>
      </div>

      {/* Center: formatting (only in WYSIWYG view) */}
      {view === 'wysiwyg' && (
        <div className="flex items-center gap-0.5">
          <Btn
            icon={<Bold className={iconSize} strokeWidth={1.8} />}
            title="Bold"
            onClick={() => onAction('toggleStrong')}
          />
          <Btn
            icon={<Italic className={iconSize} strokeWidth={1.8} />}
            title="Italic"
            onClick={() => onAction('toggleEmphasis')}
          />
          <Btn
            icon={<Strikethrough className={iconSize} strokeWidth={1.8} />}
            title="Strikethrough"
            onClick={() => onAction('toggleStrikethrough')}
          />
          <Btn
            icon={<Code className={iconSize} strokeWidth={1.8} />}
            title="Inline code"
            onClick={() => onAction('toggleInlineCode')}
          />
          <Btn
            icon={<LinkIcon className={iconSize} strokeWidth={1.8} />}
            title="Link"
            onClick={() => onAction('toggleLink')}
          />

          <div className={dividerClass} />

          <Btn
            icon={<Heading2 className={iconSize} strokeWidth={1.8} />}
            title="Heading 2"
            onClick={() => onAction('heading', { level: '2' })}
          />
          <Btn
            icon={<Heading3 className={iconSize} strokeWidth={1.8} />}
            title="Heading 3"
            onClick={() => onAction('heading', { level: '3' })}
          />
          <Btn
            icon={<List className={iconSize} strokeWidth={1.8} />}
            title="Bullet list"
            onClick={() => onAction('bulletList')}
          />
          <Btn
            icon={<ListOrdered className={iconSize} strokeWidth={1.8} />}
            title="Ordered list"
            onClick={() => onAction('orderedList')}
          />
          <Btn
            icon={<Quote className={iconSize} strokeWidth={1.8} />}
            title="Blockquote"
            onClick={() => onAction('blockquote')}
          />
          <Btn
            icon={<Minus className={iconSize} strokeWidth={1.8} />}
            title="Horizontal rule"
            onClick={() => onAction('hr')}
          />

          <div className={dividerClass} />

          {/* Directive insertion */}
          <Btn
            icon={<Image className={iconSize} strokeWidth={1.8} />}
            title="Insert image"
            onClick={() => onAction('insertDirective', { type: 'image' })}
          />
          <Btn
            icon={<Video className={iconSize} strokeWidth={1.8} />}
            title="Insert video"
            onClick={() => onAction('insertDirective', { type: 'video' })}
          />
          <Btn
            icon={<AudioLines className={iconSize} strokeWidth={1.8} />}
            title="Insert audio"
            onClick={() => onAction('insertDirective', { type: 'audio' })}
          />
          <Btn
            icon={<ExternalLink className={iconSize} strokeWidth={1.8} />}
            title="Insert link card"
            onClick={() => onAction('insertDirective', { type: 'linkcard' })}
          />
          <Btn
            icon={<GitFork className={iconSize} strokeWidth={1.8} />}
            title="Insert GitHub card"
            onClick={() => onAction('insertDirective', { type: 'github' })}
          />
          <Btn
            icon={<Package className={iconSize} strokeWidth={1.8} />}
            title="Insert Cargo card"
            onClick={() => onAction('insertDirective', { type: 'cargo' })}
          />
        </div>
      )}

      {/* Right: mode, metadata, save, theme */}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-0.5">
        {/* Feedback */}
        {feedback && (
          <span
            className={`mr-2 shrink-0 text-xs ${
              feedback.type === 'success'
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-500'
            }`}
          >
            {feedback.message}
          </span>
        )}

        {/* Mode toggle */}
        <Btn
          icon={
            view === 'wysiwyg' ? (
              <PilcrowLeft className={iconSize} strokeWidth={1.8} />
            ) : (
              <FileCode2 className={iconSize} strokeWidth={1.8} />
            )
          }
          title={
            view === 'wysiwyg' ? 'Switch to raw markdown' : 'Switch to WYSIWYG'
          }
          onClick={() => onViewChange(view === 'wysiwyg' ? 'raw' : 'wysiwyg')}
        />

        <div className={dividerClass} />

        {/* Metadata */}
        <Btn
          icon={<Settings2 className={iconSize} strokeWidth={1.8} />}
          title="Metadata"
          onClick={onMetadataToggle}
        />

        {/* Save */}
        <Btn
          icon={<Save className={iconSize} strokeWidth={1.8} />}
          title={saving ? 'Saving...' : 'Save'}
          onClick={onSave}
          disabled={saving}
        />

        {/* Theme */}
        <ThemeButton />
      </div>
    </header>
  )
}
