/* src/components/editor/milkdown-editor.tsx */

/* src/components/editor/milkdown-editor.tsx
 *
 * Main Milkdown WYSIWYG editor component.
 * Loaded via React.lazy() — must not be imported at SSR time.
 */

import { useEffect, useRef } from 'react'
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import { history } from '@milkdown/kit/plugin/history'
import { clipboard } from '@milkdown/kit/plugin/clipboard'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { getMarkdown, $view } from '@milkdown/kit/utils'
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
  type PasteImageHandler,
} from './milkdown-plugins'

import {
  DirectiveImageView,
  DirectiveVideoView,
  DirectiveAudioView,
  DirectiveLinkCardView,
  DirectiveGithubView,
  DirectiveCargoView,
} from './directive-views'

// oxlint-disable-next-line import/no-unassigned-import
import '~/styles/editor.css'

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
            component: DirectiveLinkCardView,
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

    if (pasteImagePlugin) {
      editor.use(pasteImagePlugin)
    }

    return editor
  }, [])

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

  return (
    // eslint-disable-next-line better-tailwindcss/no-unknown-classes
    <div className="article milkdown-editor">
      <Milkdown />
    </div>
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
