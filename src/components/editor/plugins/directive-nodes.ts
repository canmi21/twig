/* src/components/editor/plugins/directive-nodes.ts */

/* src/components/editor/plugins/directive-nodes.ts
 *
 * Remark-directive integration and ProseMirror node definitions
 * for each directive type (image, video, audio, linkcard, github, cargo).
 */

import { $node, $remark } from '@milkdown/kit/utils'
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
