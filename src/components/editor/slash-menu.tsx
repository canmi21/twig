/* src/components/editor/slash-menu.tsx */

/* src/components/editor/slash-menu.tsx
 *
 * Notion-style slash command menu for the Milkdown editor.
 * Typing "/" opens the menu without inserting the character.
 * Typing "//" inserts a literal "/". Other keys become the
 * search query while the menu is open.
 */

import { useState, useEffect, useCallback, useRef, type RefObject } from 'react'
import { callCommand, $prose } from '@milkdown/kit/utils'
import {
  wrapInHeadingCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand,
  wrapInBlockquoteCommand,
  insertHrCommand,
  createCodeBlockCommand,
} from '@milkdown/kit/preset/commonmark'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import {
  Image,
  Video,
  AudioLines,
  ExternalLink,
  GitFork,
  Package,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Code,
  FileCode2,
  BarChart3,
} from 'lucide-react'
import type { Ctx } from '@milkdown/kit/ctx'
import type { EditorView } from '@milkdown/kit/prose/view'
import type { Editor } from '@milkdown/kit/core'

// ---------------------------------------------------------------------------
// Slash state shared between ProseMirror plugin and React
// ---------------------------------------------------------------------------

export interface SlashState {
  open: boolean
  /** Caret position in viewport coordinates */
  x: number
  y: number
}

const slashKey = new PluginKey<SlashState>('slash')

/**
 * ProseMirror plugin that intercepts "/" keypress to open the menu
 * without inserting the character into the document.
 */
export function createSlashPlugin(onOpen: (state: SlashState) => void) {
  return $prose(
    () =>
      new Plugin({
        key: slashKey,
        props: {
          handleKeyDown(view, event) {
            if (
              event.key !== '/' ||
              event.ctrlKey ||
              event.metaKey ||
              event.altKey ||
              event.isComposing
            )
              return false

            const { $from } = view.state.selection
            if ($from.parent.type.name !== 'paragraph') return false

            // Deny after URL-forming characters or existing "/"
            const text = $from.parent.textContent.slice(0, $from.parentOffset)
            if (
              text.length > 0 &&
              /[a-zA-Z0-9:.\-\\/]/.test(text[text.length - 1])
            )
              return false

            const coords = view.coordsAtPos(view.state.selection.from)
            onOpen({
              open: true,
              x: coords.left,
              y: coords.bottom + 4,
            })
            return true // prevent "/" from entering the document
          },
        },
      }),
  )
}

export function insertDirectiveNode(
  view: EditorView,
  nodeId: string,
  attrs: Record<string, string>,
) {
  const { schema, tr } = view.state
  const nodeType = schema.nodes[nodeId]
  if (!nodeType) return
  const node = nodeType.create(attrs)
  view.dispatch(tr.replaceSelectionWith(node))
}

// ---------------------------------------------------------------------------
// Menu item definitions
// ---------------------------------------------------------------------------

interface SlashItem {
  key: string
  label: string
  keywords: string[]
  icon: React.ReactNode
  action: (ctx: Ctx, view: EditorView) => void
  form?: { fields: { name: string; label: string; placeholder?: string }[] }
}

const iconClass = 'size-4 shrink-0'

const ITEMS: SlashItem[] = [
  {
    key: 'h2',
    label: 'Heading 2',
    keywords: ['heading', 'h2', 'title'],
    icon: <Heading2 className={iconClass} strokeWidth={1.8} />,
    action: (ctx) => callCommand(wrapInHeadingCommand.key, 2)(ctx),
  },
  {
    key: 'h3',
    label: 'Heading 3',
    keywords: ['heading', 'h3', 'subtitle'],
    icon: <Heading3 className={iconClass} strokeWidth={1.8} />,
    action: (ctx) => callCommand(wrapInHeadingCommand.key, 3)(ctx),
  },
  {
    key: 'bullet-list',
    label: 'Bullet List',
    keywords: ['list', 'bullet', 'ul'],
    icon: <List className={iconClass} strokeWidth={1.8} />,
    action: (ctx) => callCommand(wrapInBulletListCommand.key)(ctx),
  },
  {
    key: 'ordered-list',
    label: 'Ordered List',
    keywords: ['list', 'ordered', 'ol', 'number'],
    icon: <ListOrdered className={iconClass} strokeWidth={1.8} />,
    action: (ctx) => callCommand(wrapInOrderedListCommand.key)(ctx),
  },
  {
    key: 'blockquote',
    label: 'Blockquote',
    keywords: ['quote', 'blockquote'],
    icon: <Quote className={iconClass} strokeWidth={1.8} />,
    action: (ctx) => callCommand(wrapInBlockquoteCommand.key)(ctx),
  },
  {
    key: 'hr',
    label: 'Divider',
    keywords: ['hr', 'divider', 'line'],
    icon: <Minus className={iconClass} strokeWidth={1.8} />,
    action: (ctx) => callCommand(insertHrCommand.key)(ctx),
  },
  {
    key: 'code-block',
    label: 'Code Block',
    keywords: ['code', 'block', 'pre'],
    icon: <Code className={iconClass} strokeWidth={1.8} />,
    action: (ctx) => callCommand(createCodeBlockCommand.key)(ctx),
  },
  {
    key: 'image',
    label: 'Image',
    keywords: ['image', 'img', 'photo'],
    icon: <Image className={iconClass} strokeWidth={1.8} />,
    form: {
      fields: [
        { name: 'src', label: 'Source', placeholder: 'hash.ext or URL' },
        { name: 'alt', label: 'Alt text', placeholder: 'Description' },
      ],
    },
    action: (_ctx, view) =>
      insertDirectiveNode(view, 'directiveImage', { src: '', alt: '' }),
  },
  {
    key: 'video',
    label: 'Video',
    keywords: ['video', 'mp4'],
    icon: <Video className={iconClass} strokeWidth={1.8} />,
    form: {
      fields: [{ name: 'src', label: 'Source', placeholder: 'hash.ext' }],
    },
    action: (_ctx, view) =>
      insertDirectiveNode(view, 'directiveVideo', { src: '' }),
  },
  {
    key: 'audio',
    label: 'Audio',
    keywords: ['audio', 'mp3'],
    icon: <AudioLines className={iconClass} strokeWidth={1.8} />,
    form: {
      fields: [{ name: 'src', label: 'Source', placeholder: 'hash.ext' }],
    },
    action: (_ctx, view) =>
      insertDirectiveNode(view, 'directiveAudio', { src: '' }),
  },
  {
    key: 'linkcard',
    label: 'Link Card',
    keywords: ['link', 'card', 'embed', 'url'],
    icon: <ExternalLink className={iconClass} strokeWidth={1.8} />,
    form: {
      fields: [
        { name: 'url', label: 'URL', placeholder: 'https://...' },
        { name: 'title', label: 'Title', placeholder: 'Card title' },
        { name: 'src', label: 'Cover', placeholder: 'URL or hash.ext' },
      ],
    },
    action: (_ctx, view) =>
      insertDirectiveNode(view, 'directiveLinkcard', {
        url: '',
        title: '',
        src: '',
      }),
  },
  {
    key: 'github',
    label: 'GitHub Card',
    keywords: ['github', 'repo', 'git'],
    icon: <GitFork className={iconClass} strokeWidth={1.8} />,
    form: {
      fields: [
        { name: 'repo', label: 'Repository', placeholder: 'owner/repo' },
        { name: 'ref', label: 'Ref', placeholder: 'branch (optional)' },
      ],
    },
    action: (_ctx, view) =>
      insertDirectiveNode(view, 'directiveGithub', { repo: '' }),
  },
  {
    key: 'cargo',
    label: 'Cargo Crate',
    keywords: ['cargo', 'crate', 'rust'],
    icon: <Package className={iconClass} strokeWidth={1.8} />,
    form: {
      fields: [
        { name: 'crate', label: 'Crate', placeholder: 'serde' },
        { name: 'version', label: 'Version', placeholder: '1.0 (optional)' },
      ],
    },
    action: (_ctx, view) =>
      insertDirectiveNode(view, 'directiveCargo', { crate: '' }),
  },
  {
    key: 'svg-board',
    label: 'SVG Board',
    keywords: ['svg', 'diagram'],
    icon: <FileCode2 className={iconClass} strokeWidth={1.8} />,
    action: (ctx, view) => {
      callCommand(createCodeBlockCommand.key)(ctx)
      requestAnimationFrame(() => {
        view.state.doc.descendants((node, pos) => {
          if (
            node.type.name === 'code_block' &&
            !node.attrs.language &&
            !node.textContent
          ) {
            view.dispatch(
              view.state.tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                language: 'svg-board',
              }),
            )
            return false
          }
          return true
        })
      })
    },
  },
  {
    key: 'tokei',
    label: 'Code Stats',
    keywords: ['tokei', 'stats'],
    icon: <BarChart3 className={iconClass} strokeWidth={1.8} />,
    action: (ctx, view) => {
      callCommand(createCodeBlockCommand.key)(ctx)
      requestAnimationFrame(() => {
        view.state.doc.descendants((node, pos) => {
          if (
            node.type.name === 'code_block' &&
            !node.attrs.language &&
            !node.textContent
          ) {
            view.dispatch(
              view.state.tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                language: 'tokei',
              }),
            )
            return false
          }
          return true
        })
      })
    },
  },
]

function filterItems(query: string): SlashItem[] {
  if (!query) return ITEMS
  const q = query.toLowerCase()
  return ITEMS.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.includes(q)),
  )
}

// ---------------------------------------------------------------------------
// React menu component — rendered as a portal in the editor
// ---------------------------------------------------------------------------

const itemClass =
  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm text-primary transition-colors'
const inputClass =
  'w-full rounded-sm border border-border bg-surface px-2 py-1 text-sm text-primary outline-none focus:border-secondary'

interface SlashMenuProps {
  slashState: SlashState
  editorRef: RefObject<Editor | null>
  viewRef: RefObject<EditorView | null>
  onClose: () => void
}

export function SlashMenu(props: SlashMenuProps) {
  if (!props.slashState.open) return null
  return (
    <div
      className="fixed z-50"
      style={{ left: props.slashState.x, top: props.slashState.y }}
    >
      <div className="w-64 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
        <SlashMenuInner {...props} />
      </div>
    </div>
  )
}

/** Inner component — mounts fresh each time the menu opens */
function SlashMenuInner({ editorRef, viewRef, onClose }: SlashMenuProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const [formItem, setFormItem] = useState<SlashItem | null>(null)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const firstInputRef = useRef<HTMLInputElement>(null)

  const items = filterItems(query)

  // Reset selection when query changes
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset on query change
  useEffect(() => setSelected(0), [query])

  // Focus first input when form opens
  useEffect(() => {
    if (formItem) {
      requestAnimationFrame(() => firstInputRef.current?.focus())
    }
  }, [formItem])

  const executeItem = useCallback(
    (item: SlashItem) => {
      const editor = editorRef.current
      const view = viewRef.current
      if (!editor || !view) return

      if (item.form) {
        const initial: Record<string, string> = {}
        for (const f of item.form.fields) initial[f.name] = ''
        setFormValues(initial)
        setFormItem(item)
        return
      }

      editor.action((ctx) => item.action(ctx, view))
      onClose()
    },
    [editorRef, viewRef, onClose],
  )

  const submitForm = useCallback(() => {
    const editor = editorRef.current
    const view = viewRef.current
    if (!formItem || !editor || !view) return

    const nodeNames: Record<string, string> = {
      image: 'directiveImage',
      video: 'directiveVideo',
      audio: 'directiveAudio',
      linkcard: 'directiveLinkcard',
      github: 'directiveGithub',
      cargo: 'directiveCargo',
    }
    const typeName = nodeNames[formItem.key]
    if (typeName) {
      insertDirectiveNode(view, typeName, formValues)
    }

    onClose()
    setFormItem(null)
  }, [formItem, formValues, editorRef, viewRef, onClose])

  // Keyboard handler: captures all input while menu is open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229) return

      // When a form is active, only handle Escape and Enter
      if (formItem) {
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          setFormItem(null)
        } else if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          e.stopPropagation()
          submitForm()
        }
        return
      }

      // "//" → insert literal "/" and close
      if (e.key === '/') {
        e.preventDefault()
        e.stopPropagation()
        const view = viewRef.current
        if (view) {
          const { state } = view
          view.dispatch(state.tr.insertText('/'))
        }
        onClose()
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        e.stopPropagation()
        setSelected((s) => (s + 1) % Math.max(items.length, 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        e.stopPropagation()
        setSelected((s) => (s - 1 + items.length) % Math.max(items.length, 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        if (items[selected]) executeItem(items[selected])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
        viewRef.current?.focus()
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        e.stopPropagation()
        if (query.length === 0) {
          onClose()
          viewRef.current?.focus()
        } else {
          setQuery((q) => q.slice(0, -1))
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Printable character → append to query
        e.preventDefault()
        e.stopPropagation()
        setQuery((q) => q + e.key)
      }
    }

    document.addEventListener('keydown', handler, { capture: true })
    return () =>
      document.removeEventListener('keydown', handler, { capture: true })
  }, [
    query,
    items,
    selected,
    formItem,
    executeItem,
    submitForm,
    onClose,
    viewRef,
  ])

  return formItem ? (
    <div className="p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
        {formItem.icon}
        {formItem.label}
      </div>
      {formItem.form?.fields.map((field, i) => (
        <label key={field.name} className="mb-2 block">
          <span className="mb-0.5 block text-xs text-secondary">
            {field.label}
          </span>
          <input
            ref={i === 0 ? firstInputRef : undefined}
            type="text"
            placeholder={field.placeholder}
            value={formValues[field.name] ?? ''}
            onChange={(e) =>
              setFormValues((v) => ({
                ...v,
                [field.name]: e.target.value,
              }))
            }
            className={inputClass}
          />
        </label>
      ))}
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setFormItem(null)}
          className="rounded-sm px-2.5 py-1 text-xs text-secondary hover:text-primary"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submitForm}
          className="rounded-sm bg-primary px-2.5 py-1 text-xs text-surface"
        >
          Insert
        </button>
      </div>
    </div>
  ) : (
    <>
      {query && (
        <div className="border-b border-border px-3 py-1.5 text-xs text-secondary">
          /{query}
        </div>
      )}
      <div className="max-h-72 overflow-y-auto p-1">
        {items.length === 0 ? (
          <div className="px-2.5 py-3 text-center text-xs text-secondary">
            No results
          </div>
        ) : (
          items.map((item, i) => (
            <button
              key={item.key}
              type="button"
              onClick={() => executeItem(item)}
              onMouseEnter={() => setSelected(i)}
              className={`${itemClass} ${i === selected ? 'bg-raised' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))
        )}
      </div>
    </>
  )
}
