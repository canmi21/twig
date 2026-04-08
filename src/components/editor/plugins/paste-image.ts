/* src/components/editor/plugins/paste-image.ts */

/* src/components/editor/plugins/paste-image.ts
 *
 * ProseMirror plugin for handling pasted images.
 * Inserts a placeholder directive node and uploads in background.
 */

import { $prose } from '@milkdown/kit/utils'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'

export interface PasteImageHandler {
  (file: File): Promise<string | null>
}

const pasteImagePluginKey = new PluginKey('pasteImage')

export function createPasteImagePlugin(onPaste: PasteImageHandler) {
  return $prose(
    () =>
      new Plugin({
        key: pasteImagePluginKey,
        props: {
          handlePaste(view, event) {
            const file = Array.from(event.clipboardData?.items ?? [])
              .find((item) => item.type.startsWith('image/'))
              ?.getAsFile()
            if (!file) return false

            event.preventDefault()

            // Insert placeholder node
            const { schema, tr } = view.state
            const nodeType = schema.nodes.directiveImage
            if (!nodeType) return false

            const placeholderNode = nodeType.create({
              src: 'uploading...',
              alt: '',
            })
            const pos = view.state.selection.from
            view.dispatch(tr.insert(pos, placeholderNode))

            // Upload in background, then replace placeholder
            onPaste(file).then((src) => {
              if (!src) return
              const { state } = view
              const newTr = state.tr
              // Find the placeholder node
              state.doc.descendants((node, nodePos) => {
                if (
                  node.type.name === 'directiveImage' &&
                  node.attrs.src === 'uploading...'
                ) {
                  newTr.setNodeMarkup(nodePos, undefined, {
                    ...node.attrs,
                    src,
                  })
                  return false
                }
                return true
              })
              view.dispatch(newTr)
            })

            return true
          },
        },
      }),
  )
}
