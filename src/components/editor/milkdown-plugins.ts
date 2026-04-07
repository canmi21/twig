/* src/components/editor/milkdown-plugins.ts */

/* src/components/editor/milkdown-plugins.ts
 *
 * Custom Milkdown plugins for remark-directive based content.
 * Defines ProseMirror nodes for each directive type and wires
 * remark-directive into the Milkdown transformer pipeline.
 */

import { $node, $remark, $prose } from '@milkdown/kit/utils'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import remarkDirective from 'remark-directive'

// ---------------------------------------------------------------------------
// remark-directive integration
// ---------------------------------------------------------------------------

export const remarkDirectivePlugin = $remark(
  'remarkDirective',
  () => remarkDirective,
)

// ---------------------------------------------------------------------------
// Helper: build a leaf-directive $node
// ---------------------------------------------------------------------------

interface DirectiveDef {
  /** Node id used internally by ProseMirror */
  id: string
  /** Directive name in markdown (e.g. 'image' for ::image{...}) */
  name: string
  /** Attribute names with defaults */
  attrs: Record<string, { default: string }>
}

function leafDirectiveNode(def: DirectiveDef) {
  return $node(def.id, () => ({
    group: 'block',
    atom: true,
    isolating: true,
    marks: '',
    defining: true,
    attrs: def.attrs,
    parseDOM: [
      {
        tag: `div[data-directive="${def.name}"]`,
        getAttrs: (dom) => {
          const el = dom as HTMLElement
          const result: Record<string, string> = {}
          for (const key of Object.keys(def.attrs)) {
            result[key] = el.getAttribute(`data-${key}`) ?? ''
          }
          return result
        },
      },
    ],
    toDOM: (node) => {
      const domAttrs: Record<string, string> = {
        'data-directive': def.name,
      }
      for (const key of Object.keys(def.attrs)) {
        domAttrs[`data-${key}`] = node.attrs[key] as string
      }
      return ['div', domAttrs]
    },
    parseMarkdown: {
      match: (n) =>
        n.type === 'leafDirective' &&
        (n as Record<string, unknown>).name === def.name,
      runner: (state, node, type) => {
        const md = node as unknown as { attributes?: Record<string, string> }
        const attrs: Record<string, string> = {}
        for (const key of Object.keys(def.attrs)) {
          attrs[key] = md.attributes?.[key] ?? def.attrs[key].default
        }
        state.addNode(type, attrs)
      },
    },
    toMarkdown: {
      match: (node) => node.type.name === def.id,
      runner: (state, node) => {
        const attributes: Record<string, string> = {}
        for (const key of Object.keys(def.attrs)) {
          const val = node.attrs[key] as string
          if (val) attributes[key] = val
        }
        state.addNode('leafDirective', undefined, undefined, {
          name: def.name,
          attributes,
        })
      },
    },
  }))
}

// ---------------------------------------------------------------------------
// Directive nodes
// ---------------------------------------------------------------------------

export const directiveImageNode = leafDirectiveNode({
  id: 'directiveImage',
  name: 'image',
  attrs: { src: { default: '' }, alt: { default: '' } },
})

export const directiveVideoNode = leafDirectiveNode({
  id: 'directiveVideo',
  name: 'video',
  attrs: { src: { default: '' } },
})

export const directiveAudioNode = leafDirectiveNode({
  id: 'directiveAudio',
  name: 'audio',
  attrs: { src: { default: '' } },
})

export const directiveLinkCardNode = leafDirectiveNode({
  id: 'directiveLinkcard',
  name: 'linkcard',
  attrs: {
    src: { default: '' },
    url: { default: '' },
    title: { default: '' },
    tone: { default: '' },
    favicon: { default: '' },
  },
})

export const directiveGithubNode = leafDirectiveNode({
  id: 'directiveGithub',
  name: 'github',
  attrs: {
    repo: { default: '' },
    ref: { default: '' },
    title: { default: '' },
    align: { default: '' },
  },
})

export const directiveCargoNode = leafDirectiveNode({
  id: 'directiveCargo',
  name: 'cargo',
  attrs: { crate: { default: '' }, version: { default: '' } },
})

// ---------------------------------------------------------------------------
// All directive nodes as a flat array for .use()
// ---------------------------------------------------------------------------

export const directiveNodes = [
  directiveImageNode,
  directiveVideoNode,
  directiveAudioNode,
  directiveLinkCardNode,
  directiveGithubNode,
  directiveCargoNode,
]

// ---------------------------------------------------------------------------
// Paste-image ProseMirror plugin
// ---------------------------------------------------------------------------

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
