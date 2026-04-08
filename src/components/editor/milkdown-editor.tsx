/* src/components/editor/milkdown-editor.tsx */

/* src/components/editor/milkdown-editor.tsx
 *
 * Main Milkdown WYSIWYG editor component.
 * Loaded via React.lazy() — must not be imported at SSR time.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Editor,
  rootCtx,
  defaultValueCtx,
  editorViewCtx,
} from '@milkdown/kit/core'
import {
  commonmark,
  codeBlockSchema,
  toggleStrongCommand,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  wrapInHeadingCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand,
  wrapInBlockquoteCommand,
  insertHrCommand,
  createCodeBlockCommand,
} from '@milkdown/kit/preset/commonmark'
import { gfm, toggleStrikethroughCommand } from '@milkdown/kit/preset/gfm'
import { history } from '@milkdown/kit/plugin/history'
import { clipboard } from '@milkdown/kit/plugin/clipboard'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { callCommand, getMarkdown, $view } from '@milkdown/kit/utils'
import type { EditorView } from '@milkdown/kit/prose/view'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import {
  ProsemirrorAdapterProvider,
  useNodeViewFactory,
} from '@prosemirror-adapter/react'

import {
  remarkDirectivePlugin,
  directiveNodes,
  directiveImageNode,
  directiveVideoNode,
  directiveAudioNode,
  directiveLinkCardNode,
  directiveGithubNode,
  directiveCargoNode,
  createPasteImagePlugin,
  imeMarkProtectionPlugin,
  type PasteImageHandler,
} from './plugins'

import {
  DirectiveImageView,
  DirectiveVideoView,
  DirectiveAudioView,
  DirectiveLinkCardView,
  DirectiveGithubView,
  DirectiveCargoView,
  CodeBlockView,
} from './views'

import {
  createSlashPlugin,
  insertDirectiveNode,
  SlashMenu,
  type SlashState,
} from './slash-menu'
import { LinkPopover, type LinkPopoverState } from './link-popover'

// oxlint-disable-next-line import/no-unassigned-import
import '~/styles/editor.css'

const CLOSED_LINK: LinkPopoverState = {
  open: false,
  x: 0,
  y: 0,
  selectedText: '',
  existingHref: '',
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MilkdownEditorProps {
  defaultValue: string
  onMarkdownChange?: (markdown: string) => void
  onPasteImage?: PasteImageHandler
  cdnPrefix: string
  /** Expose getMarkdown for parent to extract current value on demand */
  getMarkdownRef?: React.MutableRefObject<(() => string) | null>
}

// ---------------------------------------------------------------------------
// Inner editor (needs providers above it)
// ---------------------------------------------------------------------------

function MilkdownInner({
  defaultValue,
  onMarkdownChange,
  onPasteImage,
  cdnPrefix,
  getMarkdownRef,
}: MilkdownEditorProps) {
  const nodeViewFactory = useNodeViewFactory()
  const onChangeRef = useRef(onMarkdownChange)
  useEffect(() => {
    onChangeRef.current = onMarkdownChange
  }, [onMarkdownChange])

  // Slash menu state — updated by ProseMirror plugin
  const [slashState, setSlashState] = useState<SlashState>({
    open: false,
    x: 0,
    y: 0,
  })
  const [slashPlugin] = useState(() => createSlashPlugin(setSlashState))

  const editorRef = useRef<Editor | null>(null)
  const viewRef = useRef<EditorView | null>(null)

  const handleSlashClose = useCallback(() => {
    setSlashState({ open: false, x: 0, y: 0 })
  }, [])

  // Link popover state
  const [linkState, setLinkState] = useState<LinkPopoverState>(CLOSED_LINK)

  const openLinkPopover = useCallback(() => {
    const view = viewRef.current
    if (!view) return
    const { state } = view
    const { from, to, empty } = state.selection
    const linkMark = state.schema.marks.link

    // Check if cursor is inside an existing link
    if (!empty) {
      const marks = state.doc.resolve(from).marks()
      const existing = marks.find((m) => m.type === linkMark)
      if (existing) {
        // Remove the link directly
        view.dispatch(state.tr.removeMark(from, to, linkMark))
        return
      }
    }

    const coords = view.coordsAtPos(from)
    const selectedText = empty ? '' : state.doc.textBetween(from, to, ' ')
    const existingHref = ''

    setLinkState({
      open: true,
      x: coords.left,
      y: coords.bottom + 4,
      selectedText,
      existingHref,
    })
  }, [])

  const handleLinkSubmit = useCallback((href: string, text?: string) => {
    const view = viewRef.current
    if (!view) return
    const { state } = view
    const linkMark = state.schema.marks.link.create({ href })

    if (state.selection.empty) {
      // No selection: insert text node with link mark
      const displayText = text || href
      const node = state.schema.text(displayText, [linkMark])
      view.dispatch(state.tr.replaceSelectionWith(node, false))
    } else {
      // Has selection: wrap in link mark
      const { from, to } = state.selection
      view.dispatch(state.tr.addMark(from, to, linkMark))
    }

    setLinkState(CLOSED_LINK)
    view.focus()
  }, [])

  const handleLinkRemove = useCallback(() => {
    const view = viewRef.current
    if (!view) return
    const { state } = view
    const { from, to } = state.selection
    view.dispatch(state.tr.removeMark(from, to, state.schema.marks.link))
    setLinkState(CLOSED_LINK)
    view.focus()
  }, [])

  const handleLinkClose = useCallback(() => {
    setLinkState(CLOSED_LINK)
    viewRef.current?.focus()
  }, [])

  const pasteImagePlugin = onPasteImage
    ? createPasteImagePlugin(onPasteImage)
    : undefined

  const { get } = useEditor((root) => {
    const editor = Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root)
        ctx.set(defaultValueCtx, defaultValue)
        ctx.get(listenerCtx).markdownUpdated((_ctx, md) => {
          onChangeRef.current?.(md)
        })
      })
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(clipboard)
      .use(listener)
      // remark-directive integration
      .use(remarkDirectivePlugin)
      .use(directiveNodes)
      // NodeView: render directives as React components
      .use(
        $view(directiveImageNode, () =>
          nodeViewFactory({
            component: () => <DirectiveImageView cdnPrefix={cdnPrefix} />,
            as: 'div',
          }),
        ),
      )
      .use(
        $view(directiveVideoNode, () =>
          nodeViewFactory({
            component: () => <DirectiveVideoView cdnPrefix={cdnPrefix} />,
            as: 'div',
          }),
        ),
      )
      .use(
        $view(directiveAudioNode, () =>
          nodeViewFactory({
            component: () => <DirectiveAudioView cdnPrefix={cdnPrefix} />,
            as: 'div',
          }),
        ),
      )
      .use(
        $view(directiveLinkCardNode, () =>
          nodeViewFactory({
            component: () => <DirectiveLinkCardView cdnPrefix={cdnPrefix} />,
            as: 'div',
          }),
        ),
      )
      .use(
        $view(directiveGithubNode, () =>
          nodeViewFactory({
            component: DirectiveGithubView,
            as: 'div',
          }),
        ),
      )
      .use(
        $view(directiveCargoNode, () =>
          nodeViewFactory({
            component: DirectiveCargoView,
            as: 'div',
          }),
        ),
      )
      // Code block: render svg-board / tokei with shared components
      .use(
        $view(codeBlockSchema.node, () =>
          nodeViewFactory({
            component: CodeBlockView,
            as: 'div',
          }),
        ),
      )
      // Slash command detection
      .use(slashPlugin)
      // IME mark protection (must be after commonmark for mark schemas)
      .use(imeMarkProtectionPlugin)

    if (pasteImagePlugin) {
      editor.use(pasteImagePlugin)
    }

    return editor
  }, [])

  // Keep refs in sync with editor instance
  useEffect(() => {
    const editor = get()
    if (!editor) return
    editorRef.current = editor
    try {
      viewRef.current = editor.action((ctx) => ctx.get(editorViewCtx))
    } catch {
      // Editor might not be fully initialized yet
    }
  }, [get])

  // Expose getMarkdown to parent
  useEffect(() => {
    if (!getMarkdownRef) return
    getMarkdownRef.current = () => {
      const editor = get()
      if (!editor) return defaultValue
      return editor.action(getMarkdown())
    }
    return () => {
      getMarkdownRef.current = null
    }
  }, [get, getMarkdownRef, defaultValue])

  // Handle toolbar actions dispatched via CustomEvent
  useEffect(() => {
    const directiveNodeNames: Record<string, string> = {
      image: 'directiveImage',
      video: 'directiveVideo',
      audio: 'directiveAudio',
      linkcard: 'directiveLinkcard',
      github: 'directiveGithub',
      cargo: 'directiveCargo',
    }

    const handler = (e: Event) => {
      const { type, payload } = (e as CustomEvent).detail
      const editor = editorRef.current
      const view = viewRef.current
      if (!editor || !view) return

      switch (type) {
        case 'toggleStrong':
          editor.action(callCommand(toggleStrongCommand.key))
          break
        case 'toggleEmphasis':
          editor.action(callCommand(toggleEmphasisCommand.key))
          break
        case 'toggleStrikethrough':
          editor.action(callCommand(toggleStrikethroughCommand.key))
          break
        case 'toggleInlineCode':
          editor.action(callCommand(toggleInlineCodeCommand.key))
          break
        case 'toggleLink':
          openLinkPopover()
          break
        case 'heading':
          editor.action(
            callCommand(wrapInHeadingCommand.key, Number(payload?.level ?? 2)),
          )
          break
        case 'bulletList':
          editor.action(callCommand(wrapInBulletListCommand.key))
          break
        case 'orderedList':
          editor.action(callCommand(wrapInOrderedListCommand.key))
          break
        case 'blockquote':
          editor.action(callCommand(wrapInBlockquoteCommand.key))
          break
        case 'hr':
          editor.action(callCommand(insertHrCommand.key))
          break
        case 'codeBlock':
          editor.action(callCommand(createCodeBlockCommand.key))
          break
        case 'insertDirective': {
          const nodeType = directiveNodeNames[payload?.type]
          if (nodeType) insertDirectiveNode(view, nodeType, {})
          break
        }
      }

      // Only refocus if the editor lost focus (e.g. directive insertion);
      // skip when already focused to preserve storedMarks and IME state.
      if (!view.hasFocus()) view.focus()
    }

    window.addEventListener('milkdown-action', handler)
    return () => window.removeEventListener('milkdown-action', handler)
  }, [openLinkPopover])

  return (
    <>
      {/* eslint-disable-next-line better-tailwindcss/no-unknown-classes */}
      <div className="post__body article milkdown-editor">
        <Milkdown />
      </div>
      <SlashMenu
        slashState={slashState}
        editorRef={editorRef}
        viewRef={viewRef}
        onClose={handleSlashClose}
      />
      <LinkPopover
        state={linkState}
        onSubmit={handleLinkSubmit}
        onRemove={handleLinkRemove}
        onClose={handleLinkClose}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Outer wrapper with providers
// ---------------------------------------------------------------------------

export default function MilkdownEditorWrapper(props: MilkdownEditorProps) {
  return (
    <MilkdownProvider>
      <ProsemirrorAdapterProvider>
        <MilkdownInner {...props} />
      </ProsemirrorAdapterProvider>
    </MilkdownProvider>
  )
}
