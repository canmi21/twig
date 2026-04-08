/* src/components/editor/slash-menu-items.tsx */

/* src/components/editor/slash-menu-items.tsx
 *
 * Slash command menu item definitions and filtering logic.
 * Separated from slash-menu.tsx to keep the menu component focused on UI.
 */

import { callCommand } from '@milkdown/kit/utils'
import {
  wrapInHeadingCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand,
  wrapInBlockquoteCommand,
  insertHrCommand,
  createCodeBlockCommand,
} from '@milkdown/kit/preset/commonmark'
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

// ---------------------------------------------------------------------------
// Insert a directive node at the current selection
// ---------------------------------------------------------------------------

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
// Menu item type
// ---------------------------------------------------------------------------

export interface SlashItem {
  key: string
  label: string
  keywords: string[]
  icon: React.ReactNode
  action: (ctx: Ctx, view: EditorView) => void
  form?: { fields: { name: string; label: string; placeholder?: string }[] }
}

// ---------------------------------------------------------------------------
// Item definitions
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

export function filterItems(query: string): SlashItem[] {
  if (!query) return ITEMS
  const q = query.toLowerCase()
  return ITEMS.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.includes(q)),
  )
}
